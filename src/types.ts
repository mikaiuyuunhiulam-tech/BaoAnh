export interface StudySession {
  id: string;
  durationMinutes: number;
  pointsEarned: number;
  timestamp: number;
  subject: string;
}

export interface Reward {
  id: string;
  text: string;
  color: string;
}

export interface DailyGoal {
  minutes: number;
}

export interface Homework {
  id: string;
  task: string;
  deadline?: string;
  completed: boolean;
}

export interface Exam {
  id: string;
  subject: string;
  date: string;
  score?: string;
  targetScore?: string;
}

export interface RewardHistory {
  id: string;
  rewardText: string;
  timestamp: number;
}

export interface UserState {
  points: number;
  sessions: StudySession[];
  rewards: Reward[];
  dailyGoal: DailyGoal;
  homeworks: Homework[];
  exams: Exam[];
  rewardHistory: RewardHistory[];
}
