import os, sys

from pathlib import Path

if not os.getenv("CI"):
    from dotenv import load_dotenv
    
    project_root = Path(__file__).resolve().parent.parent
    load_dotenv(project_root / ".env")

SCRIPT_DIR   = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

sys.path.insert(0, PROJECT_ROOT)

from src.core.runner import run_benchmark_for_all_chains

def main():
    print("\n🚀 Starting multi-chain benchmark…")
    run_id = run_benchmark_for_all_chains()
    print(f"\n✅ All benchmarks completed! Run ID: {run_id}")

if __name__ == "__main__":
    main()
