# Solus

Model Registry + Lifecycle Manager

## Setup
```bash
pip install -r requirements.txt

# pull the four models this registry expects (see models.yaml)
ollama pull qwen2.5:1.5b
ollama pull qwen2.5-coder:7b
ollama pull qwen2.5:7b
ollama pull qwen2.5vl:7b
```

## Run the logic tests
```bash
python3 test_mlm.py
```

## Run the real smoke test
```bash
ollama serve &       
python3 smoke_test.py
```

## What's here
- `models.yaml` — the registry
- `mlm.py` — the Model Lifecycle Manager: states, single-flight loading, LRU-with-priority-floor eviction, prefetch, and a real `max_concurrent_on_demand` budget knob (defaults to 1 — "one heavy model at a time" — widen it later on stronger hardware, no other code changes needed)
- `test_mlm.py` — logic tests, mocked, run anywhere
