import httpx
from typing import List, Dict, Any
from app.core.config import settings

def get_language_id(language_name: str) -> int:
    lang_map = {"python": 71, "javascript": 63, "java": 62, "cpp": 54}
    return lang_map.get(language_name.lower(), 71)

async def submit_code(source_code: str, language_id: int, test_cases: List[Dict[str, str]], time_limit_ms: int = 2000, memory_limit_mb: int = 128) -> List[Dict[str, Any]]:
    results = []
    async with httpx.AsyncClient() as client:
        for tc in test_cases:
            payload = {
                "source_code": source_code,
                "language_id": language_id,
                "stdin": tc.get("input", ""),
                "expected_output": tc.get("output", ""),
                "cpu_time_limit": time_limit_ms / 1000.0,
                "memory_limit": memory_limit_mb * 1024
            }
            try:
                response = await client.post(f"{settings.JUDGE0_URL}/submissions?base64_encoded=false&wait=true", json=payload)
                if response.status_code == 200:
                    data = response.json()
                    status = data.get("status", {}).get("description", "Error")
                    passed = (status == "Accepted")
                    results.append({"passed": passed, "status": status, "stdout": data.get("stdout")})
                else:
                    results.append({"passed": False, "status": "API Error"})
            except Exception as e:
                results.append({"passed": False, "status": str(e)})
    return results
