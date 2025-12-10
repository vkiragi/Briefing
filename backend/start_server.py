#!/usr/bin/env python3
"""
Start the FastAPI backend server for Briefing.
"""
import sys
import subprocess
import os

def main():
    # Change to the script's directory to ensure we're in the right location
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    print("Starting Briefing API server on http://localhost:8000")
    print("Press Ctrl+C to stop the server")
    print("")
    
    try:
        # Start uvicorn server
        subprocess.run([
            sys.executable, "-m", "uvicorn",
            "api:app",
            "--reload",
            "--host", "0.0.0.0",
            "--port", "8000"
        ], check=True)
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
        sys.exit(0)
    except subprocess.CalledProcessError as e:
        print(f"\nError starting server: {e}")
        sys.exit(1)
    except FileNotFoundError:
        print("\nError: uvicorn not found. Please install dependencies:")
        print("  pip install -r requirements.txt")
        sys.exit(1)

if __name__ == "__main__":
    main()

