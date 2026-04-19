#include <atomic>
#include <cupti.h>
#include <cupti_profiler_host.h>
#include <cupti_range_profiler.h>
#include <cxxabi.h>
#include <fcntl.h>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <map>
#include <mutex>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <string>
#include <sys/mman.h>
#include <unistd.h>
#include <vector>

// Helper macro for error checking
#define CUPTI_CALL(call)                                                       \
  {                                                                            \
    CUptiResult _status = call;                                                \
    if (_status != CUPTI_SUCCESS) {                                            \
      const char *errstr;                                                      \
      cuptiGetResultString(_status, &errstr);                                  \
      fprintf(stderr, "%s:%d: error: %s failed with %s.\n", __FILE__,          \
              __LINE__, #call, errstr);                                        \
      exit(-1);                                                                \
    }                                                                          \
  }

// ============================================================================
// Data Structures
// ============================================================================

// Kernel metrics from Range Profiler
struct KernelMetrics {
  double smThroughputPct; // sm__throughput.avg.pct_of_peak_sustained
  double dramUtilPct;     // dram__throughput.avg.pct_of_peak_sustained
  bool valid;
};

// Store raw records - we'll resolve externalIds later
struct RawRecord {
  std::string name;
  unsigned long long start;
  unsigned long long end;
  uint32_t stream;
  uint32_t correlationId;
};

std::vector<RawRecord> rawRecords;
std::mutex rawRecords_mutex;

// Map to link CUPTI correlationId -> externalId
std::map<uint32_t, uint64_t> correlationMap;
std::mutex correlationMap_mutex;

// Map to store kernel metrics by correlationId
std::map<uint32_t, KernelMetrics> kernelMetricsMap;
std::mutex kernelMetrics_mutex;

// CUPTI subscriber handle for callbacks
CUpti_SubscriberHandle g_subscriber = nullptr;

// Auto-incrementing external correlation ID
std::atomic<uint64_t> g_nextExternalId{1};

// Track pushed external IDs by correlation ID
std::map<uint32_t, uint64_t> pushedExternalIds;
std::mutex pushedIds_mutex;

// ============================================================================
// Range Profiler Globals
// ============================================================================

static CUpti_RangeProfiler_Object *g_rangeProfiler = nullptr;
static CUpti_Profiler_Host_Object *g_hostObject = nullptr;
static bool g_profilerEnabled = false;
static std::atomic<uint32_t> g_rangeCount{0};

// Counter data buffers
static uint8_t *g_pCounterData = nullptr;
static size_t g_counterDataSize = 0;
static uint8_t *g_pConfigImage = nullptr;
static size_t g_configImageSize = 0;

// Metrics we want to collect
static const char *g_metricNames[] = {
    "sm__throughput.avg.pct_of_peak_sustained",
    "dram__throughput.avg.pct_of_peak_sustained"};
static const size_t g_numMetrics =
    sizeof(g_metricNames) / sizeof(g_metricNames[0]);

// Thread-local storage for tracking active correlation IDs
static thread_local uint32_t tl_activeCorrelationId = 0;

// ============================================================================
// Helper Functions
// ============================================================================

// Demangles C++ symbol names into human-readable format
char *demangle(const char *name) {
  int status = -1;
  char *demangled = abi::__cxa_demangle(name, NULL, NULL, &status);
  return (status == 0) ? demangled : NULL;
}

// Initialize the Range Profiler (called when first CUDA context is available)
static bool initRangeProfiler() {
  CUcontext ctx;
  CUdevice device;

  // Get current context and device
  if (cuCtxGetCurrent(&ctx) != CUDA_SUCCESS || ctx == nullptr) {
    fprintf(stderr, "[GROF] Warning: No active CUDA context for profiler\n");
    return false;
  }

  if (cuCtxGetDevice(&device) != CUDA_SUCCESS) {
    fprintf(stderr, "[GROF] Warning: Could not get CUDA device\n");
    return false;
  }

  // Get chip name from device (required by CUPTI 13.1+)
  char chipName[64];
  if (cuDeviceGetName(chipName, sizeof(chipName), device) != CUDA_SUCCESS) {
    fprintf(stderr, "[GROF] Warning: Could not get device chip name\n");
    return false;
  }
  fprintf(stderr, "[GROF] Detected chip: %s\n", chipName);

  // Initialize profiler host
  CUpti_Profiler_Host_Initialize_Params hostInitParams = {};
  hostInitParams.structSize = CUpti_Profiler_Host_Initialize_Params_STRUCT_SIZE;
  hostInitParams.profilerType = CUPTI_PROFILER_TYPE_RANGE_PROFILER;
  hostInitParams.pChipName = chipName;

  CUptiResult result = cuptiProfilerHostInitialize(&hostInitParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF] Warning: Could not initialize profiler host: %s\n",
            errstr);
    return false;
  }

  g_hostObject = hostInitParams.pHostObject;
  fprintf(stderr, "[GROF] Profiler host initialized\n");

  // Add metrics to config
  CUpti_Profiler_Host_ConfigAddMetrics_Params addMetricsParams = {};
  addMetricsParams.structSize =
      CUpti_Profiler_Host_ConfigAddMetrics_Params_STRUCT_SIZE;
  addMetricsParams.pHostObject = g_hostObject;
  addMetricsParams.ppMetricNames = g_metricNames;
  addMetricsParams.numMetrics = g_numMetrics;

  result = cuptiProfilerHostConfigAddMetrics(&addMetricsParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF] Warning: Could not add metrics: %s\n", errstr);
    return false;
  }

  // Get config image
  CUpti_Profiler_Host_GetConfigImageSize_Params configSizeParams = {};
  configSizeParams.structSize =
      CUpti_Profiler_Host_GetConfigImageSize_Params_STRUCT_SIZE;
  configSizeParams.pHostObject = g_hostObject;

  result = cuptiProfilerHostGetConfigImageSize(&configSizeParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF] Warning: Could not get config image size: %s\n",
            errstr);
    return false;
  }

  g_configImageSize = configSizeParams.configImageSize;
  g_pConfigImage = (uint8_t *)malloc(g_configImageSize);

  CUpti_Profiler_Host_GetConfigImage_Params configImageParams = {};
  configImageParams.structSize =
      CUpti_Profiler_Host_GetConfigImage_Params_STRUCT_SIZE;
  configImageParams.pHostObject = g_hostObject;
  configImageParams.pConfigImage = g_pConfigImage;
  configImageParams.configImageSize = g_configImageSize;

  result = cuptiProfilerHostGetConfigImage(&configImageParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF] Warning: Could not get config image: %s\n", errstr);
    free(g_pConfigImage);
    g_pConfigImage = nullptr;
    return false;
  }

  // Enable range profiler on context
  CUpti_RangeProfiler_Enable_Params enableParams = {};
  enableParams.structSize = CUpti_RangeProfiler_Enable_Params_STRUCT_SIZE;
  enableParams.ctx = ctx;

  result = cuptiRangeProfilerEnable(&enableParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF] Warning: Could not enable range profiler: %s\n",
            errstr);
    return false;
  }

  g_rangeProfiler = enableParams.pRangeProfilerObject;

  // Get counter data size
  CUpti_RangeProfiler_GetCounterDataSize_Params counterDataSizeParams = {};
  counterDataSizeParams.structSize =
      CUpti_RangeProfiler_GetCounterDataSize_Params_STRUCT_SIZE;
  counterDataSizeParams.pRangeProfilerObject = g_rangeProfiler;
  counterDataSizeParams.pMetricNames = g_metricNames;
  counterDataSizeParams.numMetrics = g_numMetrics;
  counterDataSizeParams.maxNumOfRanges = 1024; // Max ranges to store
  counterDataSizeParams.maxNumRangeTreeNodes = 1024;

  result = cuptiRangeProfilerGetCounterDataSize(&counterDataSizeParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF] Warning: Could not get counter data size: %s\n",
            errstr);
    return false;
  }

  g_counterDataSize = counterDataSizeParams.counterDataSize;
  g_pCounterData = (uint8_t *)malloc(g_counterDataSize);
  memset(g_pCounterData, 0, g_counterDataSize);

  // Initialize counter data image
  CUpti_RangeProfiler_CounterDataImage_Initialize_Params initCounterDataParams =
      {};
  initCounterDataParams.structSize =
      CUpti_RangeProfiler_CounterDataImage_Initialize_Params_STRUCT_SIZE;
  initCounterDataParams.pRangeProfilerObject = g_rangeProfiler;
  initCounterDataParams.counterDataSize = g_counterDataSize;
  initCounterDataParams.pCounterData = g_pCounterData;

  result = cuptiRangeProfilerCounterDataImageInitialize(&initCounterDataParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF] Warning: Could not initialize counter data: %s\n",
            errstr);
    return false;
  }

  // Set config for range profiler
  CUpti_RangeProfiler_SetConfig_Params setConfigParams = {};
  setConfigParams.structSize = CUpti_RangeProfiler_SetConfig_Params_STRUCT_SIZE;
  setConfigParams.pRangeProfilerObject = g_rangeProfiler;
  setConfigParams.pConfig = g_pConfigImage;
  setConfigParams.configSize = g_configImageSize;
  setConfigParams.pCounterDataImage = g_pCounterData;
  setConfigParams.counterDataImageSize = g_counterDataSize;
  setConfigParams.range = CUPTI_UserRange;
  setConfigParams.replayMode = CUPTI_KernelReplay;
  setConfigParams.maxRangesPerPass = 1024;
  setConfigParams.numNestingLevels = 1;
  setConfigParams.minNestingLevel = 1;

  result = cuptiRangeProfilerSetConfig(&setConfigParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF] Warning: Could not set range profiler config: %s\n",
            errstr);
    return false;
  }

  // Start range profiler
  CUpti_RangeProfiler_Start_Params startParams = {};
  startParams.structSize = CUpti_RangeProfiler_Start_Params_STRUCT_SIZE;
  startParams.pRangeProfilerObject = g_rangeProfiler;

  result = cuptiRangeProfilerStart(&startParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF] Warning: Could not start range profiler: %s\n",
            errstr);
    return false;
  }

  fprintf(stderr, "[GROF] Range Profiler started. Collecting: sm__throughput, "
                  "dram__throughput\n");
  return true;
}

// Begin a profiling range for a kernel launch
static void beginProfilingRange(uint32_t correlationId) {
  if (!g_rangeProfiler)
    return;

  tl_activeCorrelationId = correlationId;

  char rangeName[64];
  snprintf(rangeName, sizeof(rangeName), "kernel_%u", correlationId);

  CUpti_RangeProfiler_PushRange_Params pushParams = {};
  pushParams.structSize = CUpti_RangeProfiler_PushRange_Params_STRUCT_SIZE;
  pushParams.pRangeProfilerObject = g_rangeProfiler;
  pushParams.pRangeName = rangeName;

  CUptiResult result = cuptiRangeProfilerPushRange(&pushParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF DEBUG] PushRange failed: %s\n", errstr);
  } else {
    g_rangeCount++;
  }
}

// End a profiling range
static void endProfilingRange(uint32_t correlationId) {
  if (!g_rangeProfiler)
    return;

  CUpti_RangeProfiler_PopRange_Params popParams = {};
  popParams.structSize = CUpti_RangeProfiler_PopRange_Params_STRUCT_SIZE;
  popParams.pRangeProfilerObject = g_rangeProfiler;

  CUptiResult result = cuptiRangeProfilerPopRange(&popParams);
  if (result != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(result, &errstr);
    fprintf(stderr, "[GROF DEBUG] PopRange failed: %s\n", errstr);
  }

  tl_activeCorrelationId = 0;
}

// Finalize profiler and extract metrics
static void finalizeRangeProfiler() {
  if (!g_rangeProfiler)
    return;

  // Stop range profiler
  CUpti_RangeProfiler_Stop_Params stopParams = {};
  stopParams.structSize = CUpti_RangeProfiler_Stop_Params_STRUCT_SIZE;
  stopParams.pRangeProfilerObject = g_rangeProfiler;

  cuptiRangeProfilerStop(&stopParams);

  // Decode profiling data
  CUpti_RangeProfiler_DecodeData_Params decodeParams = {};
  decodeParams.structSize = CUpti_RangeProfiler_DecodeData_Params_STRUCT_SIZE;
  decodeParams.pRangeProfilerObject = g_rangeProfiler;

  CUptiResult result = cuptiRangeProfilerDecodeData(&decodeParams);
  if (result == CUPTI_SUCCESS) {
    fprintf(stderr, "[GROF] Decoded profiling data. Dropped ranges: %zu\n",
            decodeParams.numOfRangeDropped);

    // Get number of ranges collected
    CUpti_RangeProfiler_GetCounterDataInfo_Params infoParams = {};
    infoParams.structSize =
        CUpti_RangeProfiler_GetCounterDataInfo_Params_STRUCT_SIZE;
    infoParams.pCounterDataImage = g_pCounterData;
    infoParams.counterDataImageSize = g_counterDataSize;

    result = cuptiRangeProfilerGetCounterDataInfo(&infoParams);
    if (result == CUPTI_SUCCESS && g_hostObject) {
      fprintf(stderr, "[GROF] Total ranges in counter data: %zu\n",
              infoParams.numTotalRanges);

      // Evaluate metrics for each range
      for (size_t i = 0; i < infoParams.numTotalRanges; i++) {
        // Get range name to extract correlation ID
        CUpti_Profiler_Host_GetRangeName_Params rangeNameParams = {};
        rangeNameParams.structSize =
            CUpti_Profiler_Host_GetRangeName_Params_STRUCT_SIZE;
        rangeNameParams.pCounterDataImage = g_pCounterData;
        rangeNameParams.counterDataImageSize = g_counterDataSize;
        rangeNameParams.rangeIndex = i;
        rangeNameParams.delimiter = "/";

        result = cuptiProfilerHostGetRangeName(&rangeNameParams);
        if (result != CUPTI_SUCCESS)
          continue;

        // Parse correlation ID from range name "kernel_XXX"
        uint32_t corrId = 0;
        if (sscanf(rangeNameParams.pRangeName, "kernel_%u", &corrId) != 1)
          continue;

        // Evaluate metrics
        double metricValues[2] = {0.0, 0.0};
        CUpti_Profiler_Host_EvaluateToGpuValues_Params evalParams = {};
        evalParams.structSize =
            CUpti_Profiler_Host_EvaluateToGpuValues_Params_STRUCT_SIZE;
        evalParams.pHostObject = g_hostObject;
        evalParams.pCounterDataImage = g_pCounterData;
        evalParams.counterDataImageSize = g_counterDataSize;
        evalParams.rangeIndex = i;
        evalParams.ppMetricNames = g_metricNames;
        evalParams.numMetrics = g_numMetrics;
        evalParams.pMetricValues = metricValues;

        result = cuptiProfilerHostEvaluateToGpuValues(&evalParams);
        if (result == CUPTI_SUCCESS) {
          KernelMetrics km;
          km.smThroughputPct = metricValues[0];
          km.dramUtilPct = metricValues[1];
          km.valid = true;

          std::lock_guard<std::mutex> lock(kernelMetrics_mutex);
          kernelMetricsMap[corrId] = km;
        }

        // Free range name allocated by CUPTI
        if (rangeNameParams.pRangeName) {
          free((void *)rangeNameParams.pRangeName);
        }
      }
    }
  }

  // Disable range profiler
  CUpti_RangeProfiler_Disable_Params disableParams = {};
  disableParams.structSize = CUpti_RangeProfiler_Disable_Params_STRUCT_SIZE;
  disableParams.pRangeProfilerObject = g_rangeProfiler;

  cuptiRangeProfilerDisable(&disableParams);
  g_rangeProfiler = nullptr;

  // Deinitialize profiler host
  if (g_hostObject) {
    CUpti_Profiler_Host_Deinitialize_Params deinitParams = {};
    deinitParams.structSize =
        CUpti_Profiler_Host_Deinitialize_Params_STRUCT_SIZE;
    deinitParams.pHostObject = g_hostObject;
    cuptiProfilerHostDeinitialize(&deinitParams);
    g_hostObject = nullptr;
  }

  // Free buffers
  if (g_pCounterData) {
    free(g_pCounterData);
    g_pCounterData = nullptr;
  }
  if (g_pConfigImage) {
    free(g_pConfigImage);
    g_pConfigImage = nullptr;
  }

  fprintf(stderr,
          "[GROF] Range Profiler finalized. Collected %zu metric entries.\n",
          kernelMetricsMap.size());
}

// ============================================================================
// CUPTI Callbacks
// ============================================================================

void CUPTIAPI runtimeApiCallback(void *userdata, CUpti_CallbackDomain domain,
                                 CUpti_CallbackId cbid, const void *cbInfo) {
  const CUpti_CallbackData *cbData = (const CUpti_CallbackData *)cbInfo;

  bool isKernelLaunch =
      (domain == CUPTI_CB_DOMAIN_RUNTIME_API &&
       (cbid == CUPTI_RUNTIME_TRACE_CBID_cudaLaunchKernel_v7000 ||
        cbid == CUPTI_RUNTIME_TRACE_CBID_cudaLaunch_v3020)) ||
      (domain == CUPTI_CB_DOMAIN_DRIVER_API &&
       (cbid == CUPTI_DRIVER_TRACE_CBID_cuLaunchKernel ||
        cbid == CUPTI_DRIVER_TRACE_CBID_cuLaunchKernel_ptsz));

  if (cbData->callbackSite == CUPTI_API_ENTER) {
    uint64_t externalCorrelationId = g_nextExternalId.fetch_add(1);

    {
      std::lock_guard<std::mutex> lock(pushedIds_mutex);
      pushedExternalIds[(uint32_t)(-1)] = externalCorrelationId;
    }

    CUptiResult result = cuptiActivityPushExternalCorrelationId(
        CUPTI_EXTERNAL_CORRELATION_KIND_CUSTOM0, externalCorrelationId);

    if (result != CUPTI_SUCCESS) {
      const char *errstr;
      cuptiGetResultString(result, &errstr);
      fprintf(stderr, "[GROF] Warning: Push failed: %s\n", errstr);
    }

    // Begin profiling range for kernel launches
    if (isKernelLaunch && g_profilerEnabled) {
      beginProfilingRange((uint32_t)externalCorrelationId);
    }
  } else if (cbData->callbackSite == CUPTI_API_EXIT) {
    uint64_t poppedId = 0;
    cuptiActivityPopExternalCorrelationId(
        CUPTI_EXTERNAL_CORRELATION_KIND_CUSTOM0, &poppedId);

    if (cbData->correlationId != 0 && poppedId != 0) {
      std::lock_guard<std::mutex> lock(correlationMap_mutex);
      correlationMap[cbData->correlationId] = poppedId;
      fprintf(stderr, "[GROF DEBUG] Direct mapping: corrId=%u -> extId=%lu\n",
              cbData->correlationId, (unsigned long)poppedId);
    }

    // End profiling range for kernel launches
    if (isKernelLaunch && g_profilerEnabled) {
      endProfilingRange(cbData->correlationId);
    }
  }
}

void CUPTIAPI bufferRequested(uint8_t **buffer, size_t *size,
                              size_t *maxNumRecords) {
  *size = 1024 * 1024;
  *buffer = (uint8_t *)malloc(*size);
  *maxNumRecords = 0;
}

void processRecord(CUpti_Activity *record) {
  switch (record->kind) {
  case CUPTI_ACTIVITY_KIND_EXTERNAL_CORRELATION: {
    CUpti_ActivityExternalCorrelation *corr =
        (CUpti_ActivityExternalCorrelation *)record;
    {
      std::lock_guard<std::mutex> lock(correlationMap_mutex);
      correlationMap[corr->correlationId] = corr->externalId;
    }
    fprintf(stderr,
            "[GROF DEBUG] External correlation: corrId=%u -> extId=%lu\n",
            corr->correlationId, (unsigned long)corr->externalId);
    break;
  }
  case CUPTI_ACTIVITY_KIND_CONCURRENT_KERNEL: {
    CUpti_ActivityKernel4 *kernel = (CUpti_ActivityKernel4 *)record;
    char *dName = demangle(kernel->name);
    {
      std::lock_guard<std::mutex> lock(rawRecords_mutex);
      rawRecords.push_back({dName ? dName : kernel->name,
                            (unsigned long long)kernel->start,
                            (unsigned long long)kernel->end, kernel->streamId,
                            kernel->correlationId});
    }
    if (dName)
      free(dName);
    break;
  }
  case CUPTI_ACTIVITY_KIND_MEMCPY: {
    CUpti_ActivityMemcpy *memcpy_rec = (CUpti_ActivityMemcpy *)record;
    std::string kindStr = (memcpy_rec->copyKind == 1)   ? "HtoD"
                          : (memcpy_rec->copyKind == 2) ? "DtoH"
                                                        : "Other";
    {
      std::lock_guard<std::mutex> lock(rawRecords_mutex);
      rawRecords.push_back({"[MEMCPY] " + kindStr,
                            (unsigned long long)memcpy_rec->start,
                            (unsigned long long)memcpy_rec->end,
                            memcpy_rec->streamId, memcpy_rec->correlationId});
    }
    break;
  }
  default:
    break;
  }
}

void CUPTIAPI bufferCompleted(CUcontext ctx, uint32_t streamId, uint8_t *buffer,
                              size_t size, size_t validSize) {
  CUpti_Activity *record = NULL;
  CUptiResult status;
  while (true) {
    status = cuptiActivityGetNextRecord(buffer, validSize, &record);
    if (status == CUPTI_SUCCESS) {
      processRecord(record);
    } else
      break;
  }
  free(buffer);
}

// ============================================================================
// Initialization and Finalization
// ============================================================================

extern "C" {

static std::atomic<bool> g_profilerInitAttempted{false};

// Callback for lazy initialization on context creation
void CUPTIAPI contextCallback(void *userdata, CUpti_CallbackDomain domain,
                              CUpti_CallbackId cbid, const void *cbInfo) {
  if (domain == CUPTI_CB_DOMAIN_RESOURCE &&
      cbid == CUPTI_CBID_RESOURCE_CONTEXT_CREATED) {
    if (!g_profilerInitAttempted.exchange(true)) {
      fprintf(stderr,
              "[GROF] CUDA context created, initializing Range Profiler...\n");
      g_profilerEnabled = initRangeProfiler();
    }
  }
}

__attribute__((constructor)) void init_grof() {
  fprintf(stderr,
          "[GROF] Starting Interceptor (CUDA 13.1 Range Profiler API)...\n");

  CUPTI_CALL(cuptiActivityRegisterCallbacks(bufferRequested, bufferCompleted));

  CUPTI_CALL(cuptiActivityEnable(CUPTI_ACTIVITY_KIND_EXTERNAL_CORRELATION));
  CUPTI_CALL(cuptiActivityEnable(CUPTI_ACTIVITY_KIND_CONCURRENT_KERNEL));
  CUPTI_CALL(cuptiActivityEnable(CUPTI_ACTIVITY_KIND_MEMCPY));

  CUPTI_CALL(cuptiSubscribe(&g_subscriber, runtimeApiCallback, nullptr));

  CUPTI_CALL(
      cuptiEnableCallback(1, g_subscriber, CUPTI_CB_DOMAIN_RUNTIME_API,
                          CUPTI_RUNTIME_TRACE_CBID_cudaLaunchKernel_v7000));
  CUPTI_CALL(cuptiEnableCallback(1, g_subscriber, CUPTI_CB_DOMAIN_RUNTIME_API,
                                 CUPTI_RUNTIME_TRACE_CBID_cudaMemcpy_v3020));
  CUPTI_CALL(
      cuptiEnableCallback(1, g_subscriber, CUPTI_CB_DOMAIN_RUNTIME_API,
                          CUPTI_RUNTIME_TRACE_CBID_cudaMemcpyAsync_v3020));
  CUPTI_CALL(cuptiEnableCallback(1, g_subscriber, CUPTI_CB_DOMAIN_RUNTIME_API,
                                 CUPTI_RUNTIME_TRACE_CBID_cudaLaunch_v3020));

  CUPTI_CALL(cuptiEnableCallback(1, g_subscriber, CUPTI_CB_DOMAIN_DRIVER_API,
                                 CUPTI_DRIVER_TRACE_CBID_cuLaunchKernel));
  CUPTI_CALL(cuptiEnableCallback(1, g_subscriber, CUPTI_CB_DOMAIN_DRIVER_API,
                                 CUPTI_DRIVER_TRACE_CBID_cuLaunchKernel_ptsz));
  CUPTI_CALL(cuptiEnableCallback(1, g_subscriber, CUPTI_CB_DOMAIN_DRIVER_API,
                                 CUPTI_DRIVER_TRACE_CBID_cuMemcpyHtoD_v2));
  CUPTI_CALL(cuptiEnableCallback(1, g_subscriber, CUPTI_CB_DOMAIN_DRIVER_API,
                                 CUPTI_DRIVER_TRACE_CBID_cuMemcpyDtoH_v2));
  CUPTI_CALL(cuptiEnableCallback(1, g_subscriber, CUPTI_CB_DOMAIN_DRIVER_API,
                                 CUPTI_DRIVER_TRACE_CBID_cuMemcpyHtoDAsync_v2));
  CUPTI_CALL(cuptiEnableCallback(1, g_subscriber, CUPTI_CB_DOMAIN_DRIVER_API,
                                 CUPTI_DRIVER_TRACE_CBID_cuMemcpyDtoHAsync_v2));

  // Subscribe to resource callbacks for lazy profiler init
  CUpti_SubscriberHandle resourceSubscriber;
  CUptiResult result = cuptiSubscribe(
      &resourceSubscriber, (CUpti_CallbackFunc)contextCallback, nullptr);
  if (result == CUPTI_SUCCESS) {
    cuptiEnableCallback(1, resourceSubscriber, CUPTI_CB_DOMAIN_RESOURCE,
                        CUPTI_CBID_RESOURCE_CONTEXT_CREATED);
  }

  fprintf(stderr,
          "[GROF] External correlation enabled (Runtime + Driver API).\n");
}

__attribute__((destructor)) void fini_grof() {
  CUptiResult flushResult = cuptiActivityFlushAll(0);
  if (flushResult != CUPTI_SUCCESS) {
    const char *errstr;
    cuptiGetResultString(flushResult, &errstr);
    fprintf(stderr, "[GROF] Warning: Flush returned %s\n", errstr);
  }

  finalizeRangeProfiler();

  if (g_subscriber) {
    cuptiUnsubscribe(g_subscriber);
  }

  fprintf(stderr, "[GROF] Correlation map has %zu entries\n",
          correlationMap.size());
  fprintf(stderr, "[GROF] Metrics map has %zu entries\n",
          kernelMetricsMap.size());

  // Determine output directory from GROF_OUTPUT_DIR env var (default: ".")
  const char *outputDirEnv = getenv("GROF_OUTPUT_DIR");
  std::string outputDir = (outputDirEnv && outputDirEnv[0] != '\0')
                               ? std::string(outputDirEnv)
                               : std::string(".");

  // Create output directory if it doesn't exist (like mkdir -p)
  {
    std::string cmd = "mkdir -p \"" + outputDir + "\"";
    int ret = system(cmd.c_str());
    if (ret != 0) {
      fprintf(stderr,
              "[GROF] Warning: Could not create output directory: %s\n",
              outputDir.c_str());
    }
  }

  std::string outputPath = outputDir + "/gpu_trace.json";
  fprintf(stderr, "[GROF] Writing trace to: %s\n", outputPath.c_str());

  std::ofstream f(outputPath);
  f << "[\n";
  for (size_t i = 0; i < rawRecords.size(); ++i) {
    uint64_t extId = 0;
    auto corrIt = correlationMap.find(rawRecords[i].correlationId);
    if (corrIt != correlationMap.end()) {
      extId = corrIt->second;
    }

    double smThroughput = -1.0;
    double dramUtil = -1.0;
    auto metricsIt = kernelMetricsMap.find(rawRecords[i].correlationId);
    if (metricsIt != kernelMetricsMap.end() && metricsIt->second.valid) {
      smThroughput = metricsIt->second.smThroughputPct;
      dramUtil = metricsIt->second.dramUtilPct;
    }

    f << "  { \"name\": \"" << rawRecords[i].name << "\", "
      << "\"ph\": \"X\", "
      << "\"ts\": " << std::fixed << std::setprecision(3)
      << rawRecords[i].start / 1000.0 << ", "
      << "\"dur\": " << (rawRecords[i].end - rawRecords[i].start) / 1000.0
      << ", "
      << "\"pid\": 1, \"tid\": " << rawRecords[i].stream << ", "
      << "\"args\": { "
      << "\"correlationId\": " << rawRecords[i].correlationId << ", "
      << "\"externalId\": " << extId;

    if (smThroughput >= 0) {
      f << ", \"sm_throughput_pct\": " << std::fixed << std::setprecision(2)
        << smThroughput;
    }
    if (dramUtil >= 0) {
      f << ", \"dram_utilization_pct\": " << std::fixed << std::setprecision(2)
        << dramUtil;
    }

    f << " } }" << (i == rawRecords.size() - 1 ? "" : ",") << "\n";
  }
  f << "]\n";
  f.close();
  fprintf(stderr, "[GROF] Finalized. %zu records saved to %s\n",
          rawRecords.size(), outputPath.c_str());
}
}
