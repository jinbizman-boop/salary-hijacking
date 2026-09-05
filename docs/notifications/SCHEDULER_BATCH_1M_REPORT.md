# Scheduler Batch 1M Report

PERF_018=PASS_ENGINE_MODEL_CAPABILITY_UNVERIFIED

processed=1000000
requested=1000000
duplicates=0
durationMs=850
throughputPerSecond=1176471
shardSize=5000
shardCount=200
shardLatencyP50Ms=3.16
shardLatencyP95Ms=4.91

Truth rule: this is not PASS_RUNTIME_FULL. It proves deterministic sharding/idempotency engine behavior for 1M synthetic candidates, while Cloudflare/Neon contract-equivalent 1M runtime capacity remains unverified.
