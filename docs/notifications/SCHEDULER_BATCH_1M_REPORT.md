# Scheduler Batch 1M Report

PERF_018=PASS_ENGINE_MODEL_CAPABILITY_UNVERIFIED

processed=1000000
requested=1000000
duplicates=0
durationMs=1139
throughputPerSecond=877963
shardSize=5000
shardCount=200
shardLatencyP50Ms=3.89
shardLatencyP95Ms=10.54

Truth rule: this is not PASS_RUNTIME_FULL. It proves deterministic sharding/idempotency engine behavior for 1M synthetic candidates, while Cloudflare/Neon contract-equivalent 1M runtime capacity remains unverified.
