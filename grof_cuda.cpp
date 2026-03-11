#include <cupti.h>
#include <stdio.h>
#include <stdlib.h>
#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <iomanip>
#include <cxxabi.h>

// Helper macro for error checking
#define CUPTI_CALL(call) { \
    CUptiResult _status = call; \
    if (_status != CUPTI_SUCCESS) { \
        const char *errstr; \
        cuptiGetResultString(_status, &errstr); \
        fprintf(stderr, "%s:%d: error: %s failed with %s.\n", __FILE__, __LINE__, #call, errstr); \
        exit(-1); \
    } \
}

// Data structure to hold our profiling results
struct GpuRecord {
    std::string name;
    unsigned long long start;
    unsigned long long end;
    uint32_t stream;
};

std::vector<GpuRecord> records;

// Demangles C++ symbol names into human-readable format
char* demangle(const char* name) {
    int status = -1;
    char* demangled = abi::__cxa_demangle(name, NULL, NULL, &status);
    return (status == 0) ? demangled : NULL;
}

// CUPTI calls this when it needs a new buffer
void CUPTIAPI bufferRequested(uint8_t **buffer, size_t *size, size_t *maxNumRecords) {
    *size = 1024 * 1024; // 1MB
    *buffer = (uint8_t *)malloc(*size);
    *maxNumRecords = 0;
}

// Parses raw activity records and saves them to our vector
void processRecord(CUpti_Activity *record) {
    switch (record->kind) {
        case CUPTI_ACTIVITY_KIND_CONCURRENT_KERNEL: {
            CUpti_ActivityKernel4 *kernel = (CUpti_ActivityKernel4 *)record;
            char* dName = demangle(kernel->name);
            records.push_back({
                dName ? dName : kernel->name,
                (unsigned long long)kernel->start,
                (unsigned long long)kernel->end,
                kernel->streamId
            });
            if (dName) free(dName);
            break;
        }
        case CUPTI_ACTIVITY_KIND_MEMCPY: {
            CUpti_ActivityMemcpy *memcpy = (CUpti_ActivityMemcpy *)record;
            std::string kindStr = (memcpy->copyKind == 1) ? "HtoD" : (memcpy->copyKind == 2) ? "DtoH" : "Other";
            records.push_back({
                "[MEMCPY] " + kindStr,
                (unsigned long long)memcpy->start,
                (unsigned long long)memcpy->end,
                memcpy->streamId
            });
            break;
        }
        default: break;
    }
}

// CUPTI calls this when a buffer is full of data
void CUPTIAPI bufferCompleted(CUcontext ctx, uint32_t streamId, uint8_t *buffer, size_t size, size_t validSize) {
    CUpti_Activity *record = NULL;
    CUptiResult status;
    while (true) {
        status = cuptiActivityGetNextRecord(buffer, validSize, &record);
        if (status == CUPTI_SUCCESS) {
            processRecord(record);
        } else break;
    }
    free(buffer);
}

extern "C" {
    // Initialization: Happens at program start
    __attribute__((constructor))
    void init_grof() {
        fprintf(stderr, "[GROF] Starting Interceptor...\n");
        CUPTI_CALL(cuptiActivityRegisterCallbacks(bufferRequested, bufferCompleted));
        CUPTI_CALL(cuptiActivityEnable(CUPTI_ACTIVITY_KIND_CONCURRENT_KERNEL));
        CUPTI_CALL(cuptiActivityEnable(CUPTI_ACTIVITY_KIND_MEMCPY));
    }

    // Finalization: Happens at program exit. Writes the JSON file.
    __attribute__((destructor))
    void fini_grof() {
        cuptiActivityFlushAll(0); // Flush remaining buffers
        
        std::ofstream f("gpu_trace.json");
        f << "[\n";
        for (size_t i = 0; i < records.size(); ++i) {
            f << "  { \"name\": \"" << records[i].name << "\", "
              << "\"ph\": \"X\", " // Complete event
              << "\"ts\": " << std::fixed << std::setprecision(3) << records[i].start / 1000.0 << ", " // Microseconds
              << "\"dur\": " << (records[i].end - records[i].start) / 1000.0 << ", "
              << "\"pid\": 1, \"tid\": " << records[i].stream << " }"
              << (i == records.size() - 1 ? "" : ",") << "\n";
        }
        f << "]\n";
        f.close();
        fprintf(stderr, "[GROF] Finalized. %zu records saved to gpu_trace.json\n", records.size());
    }
}
