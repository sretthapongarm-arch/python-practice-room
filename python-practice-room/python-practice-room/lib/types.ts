export type Problem = {
  id: string;
  title: string;
  description: string;
  difficulty: "easy" | "medium";
  starter_code: string;
  is_published: boolean;
  created_at: string;
};

export type TestCase = {
  id: string;
  problem_id: string;
  input: string;
  expected_output: string;
  is_hidden: boolean;
  position: number;
};

export type ResultStatus = "passed" | "failed" | "error" | "timeout";

export type ExecutionResult = {
  test_case_id: string;
  status: ResultStatus;
  actual_output: string;
  error_message: string;
  runtime_ms: number;
};

export type Submission = {
  id: string;
  problem_id: string;
  student_name: string;
  code: string;
  passed_count: number;
  total_count: number;
  status: "passed" | "failed";
  created_at: string;
};

export type StoredExecutionResult = ExecutionResult & {
  id: string;
  submission_id: string;
};
