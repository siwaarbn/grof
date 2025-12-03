import torch
from transformers import BertModel, BertConfig
from torch.utils.benchmark import Timer


def benchmark_bert(batch_size: int, seq_length: int = 128, min_run_time: float = 1.0):
    """Benchmark BERT inference throughput."""
    # Default BERT config (bert-base-uncased: 12 layers, 768 hidden, 12 heads)
    config = BertConfig()
    model = BertModel(config).cuda().eval()

    # Random token ids and attention mask
    input_ids = torch.randint(0, config.vocab_size, (batch_size, seq_length), device='cuda')
    attention_mask = torch.ones(batch_size, seq_length, device='cuda')

    timer = Timer(
        stmt='model(input_ids, attention_mask=attention_mask)',
        globals={'model': model, 'input_ids': input_ids, 'attention_mask': attention_mask},
        label='BERT',
        sub_label=f'batch={batch_size}, seq={seq_length}',
        description='inference'
    )

    measurement = timer.blocked_autorange(min_run_time=min_run_time)

    sequences_per_sec = batch_size / measurement.median

    return measurement, sequences_per_sec