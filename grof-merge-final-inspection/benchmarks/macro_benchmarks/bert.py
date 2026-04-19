import torch
from transformers import BertModel, BertConfig
from torch.utils.benchmark import Timer

def set_seed(seed: int = 42):
    """Ensure reproducible results."""
    torch.manual_seed(seed)
    torch.cuda.manual_seed_all(seed)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False


def benchmark_bert(batch_size: int, seq_length: int = 128, min_run_time: float = 1.0):
    """Benchmark BERT inference throughput."""
    set_seed(42)
    # Default BERT config (bert-base-uncased: 12 layers, 768 hidden, 12 heads)
    config = BertConfig()
    model = BertModel(config).cuda().eval()

    # Random token ids and attention mask
    input_ids = torch.randint(0, config.vocab_size, (batch_size, seq_length), device='cuda')
    attention_mask = torch.ones(batch_size, seq_length, device='cuda')

    # Warmup
    with torch.no_grad():
        model(input_ids, attention_mask=attention_mask)

    timer = Timer(
        stmt='with torch.no_grad(): model(input_ids, attention_mask=attention_mask)',
        globals={'model': model,
                 'input_ids': input_ids,
                 'attention_mask': attention_mask,
                 'torch': torch},
        label='BERT',
        sub_label=f'batch={batch_size}, seq={seq_length}',
        description='inference'
    )
    measurement = timer.blocked_autorange(min_run_time=min_run_time)
    sequences_per_sec = batch_size / measurement.median

    # Clean up GPU memory
    del model, input_ids, attention_mask
    torch.cuda.empty_cache()

    return measurement, sequences_per_sec


if __name__ == "__main__":
    if not torch.cuda.is_available():
        print("CUDA not available!")
        exit(1)

    print("=" * 60)
    print("BERT Benchmark Test")
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print("=" * 60)

    for batch_size in [1, 8, 32]:
        print(f"\nBatch size: {batch_size}")
        m, sps = benchmark_bert(batch_size, seq_length=128, min_run_time=0.5)
        print(f"  Time: {m.median * 1000:.2f} ms")
        print(f"  Throughput: {sps:.1f} seq/sec")