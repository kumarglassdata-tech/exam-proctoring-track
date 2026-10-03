import sys
import io
import time
import traceback
import subprocess
import tempfile
import os
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(tags=['execute'])

class TestCase(BaseModel):
    input: str
    expected_output: str

class ExecuteRequest(BaseModel):
    code: str
    language: str = "python"
    test_cases: Optional[List[TestCase]] = None
    custom_input: Optional[str] = None

class TestCaseResult(BaseModel):
    case_num: int
    input: str
    expected_output: str
    actual_output: str
    passed: bool
    runtime_ms: float
    error: Optional[str] = None

class ExecuteResponse(BaseModel):
    status: str  # "Accepted", "Wrong Answer", "Syntax Error", "Runtime Error", "Time Limit Exceeded"
    stdout: str
    stderr: str
    passed_count: int
    total_count: int
    runtime_ms: float
    results: List[TestCaseResult]

@router.post("/execute", response_model=ExecuteResponse)
async def run_code(req: ExecuteRequest):
    if req.language.lower() != "python":
        raise HTTPException(400, detail="Currently Python code execution is supported.")

    code = req.code or ""
    test_cases = req.test_cases or []
    
    if req.custom_input is not None and not test_cases:
        test_cases = [TestCase(input=req.custom_input, expected_output="")]

    start_time = time.time()
    results: List[TestCaseResult] = []
    total_passed = 0
    overall_status = "Accepted"
    full_stdout = ""
    full_stderr = ""

    # Check for basic syntax before running test cases
    try:
        compile(code, "<string>", "exec")
    except SyntaxError as e:
        err_msg = f"SyntaxError: {e.msg} at line {e.lineno}, col {e.offset}\n{e.text or ''}"
        return ExecuteResponse(
            status="Syntax Error",
            stdout="",
            stderr=err_msg,
            passed_count=0,
            total_count=len(test_cases),
            runtime_ms=0.0,
            results=[]
        )

    # If no test cases provided, run script once standalone
    if not test_cases:
        test_cases = [TestCase(input="", expected_output="")]

    for idx, tc in enumerate(test_cases, 1):
        case_start = time.time()
        # Harness wrapper script
        wrapper_code = f"""
import sys, io
sys.stdin = io.StringIO({repr(tc.input)})
sys_stdout = io.StringIO()
sys.stdout = sys_stdout

{code}

output_str = sys_stdout.getvalue()
sys.stdout = sys.__stdout__
print(output_str, end='')
"""
        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as f:
            f.write(wrapper_code)
            temp_path = f.name

        try:
            proc = subprocess.run(
                [sys.executable, temp_path],
                capture_output=True,
                text=True,
                timeout=3.0,
            )
            case_time = (time.time() - case_start) * 1000
            actual = proc.stdout.strip()
            expected = tc.expected_output.strip()
            stderr_out = proc.stderr.strip()

            if proc.returncode != 0:
                overall_status = "Runtime Error"
                if stderr_out:
                    full_stderr += f"Case {idx} Error:\n{stderr_out}\n"
                results.append(TestCaseResult(
                    case_num=idx,
                    input=tc.input,
                    expected_output=expected,
                    actual_output=actual,
                    passed=False,
                    runtime_ms=round(case_time, 2),
                    error=stderr_out or "Runtime Error"
                ))
            else:
                passed = (actual == expected) if expected else True
                if passed:
                    total_passed += 1
                elif overall_status == "Accepted":
                    overall_status = "Wrong Answer"

                full_stdout += f"Case {idx} Output:\n{actual}\n"
                results.append(TestCaseResult(
                    case_num=idx,
                    input=tc.input,
                    expected_output=expected,
                    actual_output=actual,
                    passed=passed,
                    runtime_ms=round(case_time, 2),
                ))

        except subprocess.TimeoutExpired:
            overall_status = "Time Limit Exceeded"
            results.append(TestCaseResult(
                case_num=idx,
                input=tc.input,
                expected_output=tc.expected_output,
                actual_output="",
                passed=False,
                runtime_ms=3000.0,
                error="Time Limit Exceeded (3.0s limit)"
            ))
        finally:
            if os.path.exists(temp_path):
                try: os.remove(temp_path)
                except: pass

    total_time = (time.time() - start_time) * 1000
    return ExecuteResponse(
        status=overall_status,
        stdout=full_stdout,
        stderr=full_stderr,
        passed_count=total_passed,
        total_count=len(test_cases),
        runtime_ms=round(total_time, 2),
        results=results
    )
