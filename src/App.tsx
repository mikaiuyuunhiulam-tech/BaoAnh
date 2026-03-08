import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Square, Pause, Timer as TimerIcon, Trophy, History, Settings, PieChart, Plus, Trash2, RotateCw, Heart, Sparkles, Quote, BookOpen, GraduationCap, CheckCircle2, Circle, AlertCircle } from 'lucide-react';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { cn } from './lib/utils';
import { StudySession, Reward, UserState, Exam } from './types';

const DEFAULT_REWARDS: Reward[] = [
  { id: '1', text: 'Nghỉ 5 phút 🎀', color: '#ffb7c5' },
  { id: '2', text: 'Xem Youtube 10p 🌸', color: '#ffdae3' },
  { id: '3', text: 'Ăn nhẹ 🍰', color: '#ffe4e1' },
  { id: '4', text: 'Chơi game 15p 🎮', color: '#ffc0cb' },
  { id: '5', text: 'Nghe nhạc 🎵', color: '#ffd1dc' },
  { id: '6', text: 'Mua trà sữa 🧋', color: '#ff99aa' },
];

const QUOTES = [
  "Học tập là hạt giống của hạnh phúc. 🌸",
  "Mỗi bước nhỏ đều đưa bạn đến gần ước mơ hơn. ✨",
  "Bạn đang làm rất tốt, hãy tiếp tục nhé! 🎀",
  "Tương lai thuộc về những người tin vào vẻ đẹp của ước mơ. ☁️",
  "Hãy là phiên bản tuyệt vời nhất của chính mình. 🌷",
  "Học không chỉ là kiến thức, mà là sự trưởng thành. 🦢",
];

const POINTS_PER_15_MIN = 1;

const FloatingBackground = () => {
  const elements = [
    { icon: '🎀', size: 'text-3xl', duration: 15, delay: 0, left: '5%' },
    { icon: '🌸', size: 'text-2xl', duration: 18, delay: 2, left: '15%' },
    { icon: '✨', size: 'text-xl', duration: 12, delay: 5, left: '25%' },
    { icon: '💖', size: 'text-2xl', duration: 20, delay: 1, left: '35%' },
    { icon: '🎀', size: 'text-3xl', duration: 16, delay: 8, left: '45%' },
    { icon: '🌷', size: 'text-2xl', duration: 22, delay: 3, left: '55%' },
    { icon: '☁️', size: 'text-3xl', duration: 25, delay: 0, left: '65%' },
    { icon: '🌸', size: 'text-xl', duration: 14, delay: 7, left: '75%' },
    { icon: '🎀', size: 'text-3xl', duration: 19, delay: 4, left: '85%' },
    { icon: '✨', size: 'text-2xl', duration: 13, delay: 6, left: '95%' },
    { icon: '💖', size: 'text-2xl', duration: 21, delay: 2, left: '10%' },
    { icon: '🌷', size: 'text-2xl', duration: 17, delay: 9, left: '50%' },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {elements.map((el, i) => (
        <motion.div
          key={i}
          className={`absolute bottom-[-50px] ${el.size} opacity-40`}
          style={{ left: el.left }}
          animate={{
            y: [0, -window.innerHeight - 100],
            x: [0, Math.sin(i) * 100, 0],
            rotate: [0, 360],
          }}
          transition={{
            duration: el.duration,
            repeat: Infinity,
            delay: el.delay,
            ease: "linear",
          }}
        >
          {el.icon}
        </motion.div>
      ))}
    </div>
  );
};

export default function App() {
  const [state, setState] = useState<UserState>(() => {
    const saved = localStorage.getItem('study-rewards-state');
    const defaultState: UserState = {
      points: 0,
      sessions: [],
      rewards: DEFAULT_REWARDS,
      dailyGoal: { minutes: 120 },
      homeworks: [],
      exams: [],
      rewardHistory: [],
    };
    
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
          ...defaultState, 
          ...parsed,
          sessions: Array.isArray(parsed?.sessions) ? parsed.sessions : defaultState.sessions,
          rewards: Array.isArray(parsed?.rewards) ? parsed.rewards : defaultState.rewards,
          dailyGoal: { minutes: parsed?.dailyGoal?.minutes || defaultState.dailyGoal.minutes },
          homeworks: Array.isArray(parsed?.homeworks) ? parsed.homeworks : defaultState.homeworks,
          exams: Array.isArray(parsed?.exams) ? parsed.exams : defaultState.exams,
          rewardHistory: Array.isArray(parsed?.rewardHistory) ? parsed.rewardHistory : defaultState.rewardHistory,
          points: typeof parsed?.points === 'number' ? parsed.points : defaultState.points,
        };
      } catch (e) {
        console.error("Failed to parse saved state", e);
        return defaultState;
      }
    }
    return defaultState;
  });

  const [activeTab, setActiveTab] = useState<'timer' | 'wheel' | 'history' | 'stats' | 'homework' | 'exams'>('timer');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinResult, setSpinResult] = useState<Reward | null>(null);
  const [rotation, setRotation] = useState(0);
  const [pauseDuration, setPauseDuration] = useState(0);
  const [showPauseWarning, setShowPauseWarning] = useState(false);
  const [currentSubject, setCurrentSubject] = useState('');
  const [newRewardText, setNewRewardText] = useState('');
  const [newHomework, setNewHomework] = useState('');
  const [newHomeworkDeadline, setNewHomeworkDeadline] = useState('');
  const [newExamSubject, setNewExamSubject] = useState('');
  const [newExamDate, setNewExamDate] = useState('');
  const [newExamTarget, setNewExamTarget] = useState('');
  const [expandedHomeworkId, setExpandedHomeworkId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('study-rewards-state', JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && !isPaused) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timer finished
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isPaused]);

  useEffect(() => {
    if (timeLeft === 0 && isTimerRunning) {
      handleSessionComplete();
    }
  }, [timeLeft, isTimerRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning && isPaused) {
      interval = setInterval(() => {
        setPauseDuration((prev) => {
          if (prev + 1 >= 1800) {
            setShowPauseWarning(true);
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setPauseDuration(0);
      setShowPauseWarning(false);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isPaused]);



  const handleSessionComplete = () => {
    setIsTimerRunning(false);
    const points = Math.floor(selectedDuration / 15) * POINTS_PER_15_MIN;
    const newSession: StudySession = {
      id: Date.now().toString(),
      durationMinutes: selectedDuration,
      pointsEarned: points,
      timestamp: Date.now(),
      subject: currentSubject,
    };

    setState((prev) => ({
      ...prev,
      points: prev.points + points,
      sessions: [newSession, ...prev.sessions],
    }));
    alert(`Chúc mừng! Bạn đã hoàn thành ${selectedDuration} phút học môn ${currentSubject} và nhận được ${points} điểm!`);
    setCurrentSubject('');
  };

  const startTimer = (mins: number) => {
    setSelectedDuration(mins);
    setTimeLeft(mins * 60);
    setIsTimerRunning(true);
    setIsPaused(false);
    // Trigger first message immediately
  };

  const addReward = () => {
    if (!newRewardText.trim()) return;
    const colors = ['#ffb7c5', '#ffdae3', '#ffe4e1', '#ffc0cb', '#ffd1dc', '#ff99aa'];
    const newReward: Reward = {
      id: Date.now().toString(),
      text: newRewardText.trim(),
      color: colors[state.rewards.length % colors.length]
    };
    setState(prev => ({ ...prev, rewards: [...prev.rewards, newReward] }));
    setNewRewardText('');
  };

  const addHomework = () => {
    if (!newHomework.trim()) return;
    const item = { 
      id: Date.now().toString(), 
      task: newHomework.trim(), 
      deadline: newHomeworkDeadline,
      completed: false 
    };
    setState(prev => ({ ...prev, homeworks: [...prev.homeworks, item] }));
    setNewHomework('');
    setNewHomeworkDeadline('');
  };

  const toggleHomework = (id: string) => {
    setState(prev => ({
      ...prev,
      homeworks: prev.homeworks.map(h => h.id === id ? { ...h, completed: !h.completed } : h)
    }));
  };

  const deleteHomework = (id: string) => {
    setState(prev => ({
      ...prev,
      homeworks: prev.homeworks.filter(h => h.id !== id)
    }));
  };

  const addExam = () => {
    if (!newExamSubject.trim() || !newExamDate.trim()) return;
    const item = { 
      id: Date.now().toString(), 
      subject: newExamSubject.trim(), 
      date: newExamDate.trim(),
      targetScore: newExamTarget.trim() || undefined
    };
    setState(prev => ({ ...prev, exams: [...prev.exams, item] }));
    setNewExamSubject('');
    setNewExamDate('');
    setNewExamTarget('');
  };

  const updateExamScore = (id: string, score: string) => {
    setState(prev => ({
      ...prev,
      exams: prev.exams.map(e => e.id === id ? { ...e, score } : e)
    }));
  };

  const updateExamTarget = (id: string, targetScore: string) => {
    setState(prev => ({
      ...prev,
      exams: prev.exams.map(e => e.id === id ? { ...e, targetScore } : e)
    }));
  };

  const getExamAnalysis = (exam: Exam) => {
    if (!exam.score || !exam.targetScore) return null;
    const scoreNum = parseFloat(exam.score);
    const targetNum = parseFloat(exam.targetScore);
    if (isNaN(scoreNum) || isNaN(targetNum)) return null;

    if (scoreNum < targetNum) {
      const diff = targetNum - scoreNum;
      // Suggestion: 1 hour of study for every 0.5 point missing
      const suggestedHours = Math.ceil(diff * 2);
      return {
        diff: diff.toFixed(1),
        suggestedHours
      };
    }
    return null;
  };

  const deleteExam = (id: string) => {
    setState(prev => ({
      ...prev,
      exams: prev.exams.filter(e => e.id !== id)
    }));
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const cancelTimer = () => {
    setIsTimerRunning(false);
    setIsPaused(false);
    setTimeLeft(0);
  };

  const spinWheel = () => {
    if (state.points < 1 || isSpinning) return;

    setIsSpinning(true);
    setSpinResult(null);
    
    const spinCount = 5 + Math.random() * 5; // 5-10 full rotations
    const extraDegrees = Math.random() * 360;
    const totalRotation = rotation + spinCount * 360 + extraDegrees;
    
    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      const finalAngle = totalRotation % 360;
      const segmentAngle = 360 / state.rewards.length;
      // The wheel rotates clockwise, but the pointer is at the top (0 degrees)
      // We need to find which segment is at the top.
      // 0 degrees is the start of the first segment.
      // As it rotates, the "top" moves through segments in reverse order.
      const index = Math.floor(((360 - finalAngle) % 360) / segmentAngle);
      const result = state.rewards[index];
      setSpinResult(result);
      setState(prev => ({ 
        ...prev, 
        points: prev.points - 1,
        rewardHistory: [
          {
            id: Math.random().toString(36).substr(2, 9),
            rewardText: result.text,
            timestamp: Date.now()
          },
          ...prev.rewardHistory
        ].slice(0, 50)
      }));
    }, 4000);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getDailyStats = () => {
    const now = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(now.getDate() - i);
      return d.toISOString().split('T')[0];
    }).reverse();

    return last7Days.map(date => {
      const daySessions = state.sessions.filter(s => 
        new Date(s.timestamp).toISOString().split('T')[0] === date
      );
      const totalMinutes = daySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      return {
        date,
        minutes: totalMinutes,
        goal: state.dailyGoal.minutes,
        reached: totalMinutes >= state.dailyGoal.minutes
      };
    });
  };

  const isOverdue = (deadline?: string, completed?: boolean) => {
    if (!deadline || completed) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return deadlineDate < today;
  };

  const isDueToday = (deadline?: string, completed?: boolean) => {
    if (!deadline || completed) return false;
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dDate = new Date(deadlineDate);
    dDate.setHours(0, 0, 0, 0);
    return dDate.getTime() === today.getTime();
  };

  const stats = getDailyStats();
  const hasUrgentHomework = state.homeworks.some(hw => isOverdue(hw.deadline, hw.completed) || isDueToday(hw.deadline, hw.completed));
  const isExamOverdueWithoutScore = (exam: Exam) => {
    if (exam.score) return false;
    const examDate = new Date(exam.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return examDate < today;
  };
  const hasOverdueExam = state.exams.some(isExamOverdueWithoutScore);

  const getSubjectAverages = () => {
    const subjectScores: Record<string, number[]> = {};
    state.exams.forEach(exam => {
      if (exam.score) {
        const score = parseFloat(exam.score);
        if (!isNaN(score)) {
          if (!subjectScores[exam.subject]) {
            subjectScores[exam.subject] = [];
          }
          subjectScores[exam.subject].push(score);
        }
      }
    });

    return Object.entries(subjectScores).map(([subject, scores]) => ({
      subject,
      average: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(2)
    }));
  };

  const subjectAverages = getSubjectAverages();

  const getHomeworkStats = () => {
    if (state.homeworks.length === 0) return null;
    const completed = state.homeworks.filter(h => h.completed).length;
    const total = state.homeworks.length;
    const rate = Math.round((completed / total) * 100);
    
    let message = "";
    if (rate === 100) message = "Tuyệt vời quá nàng ơi! Tất cả bài tập đã hoàn thành rồi. ✨";
    else if (rate >= 80) message = "Nàng đang làm rất tốt, chỉ còn một chút nữa thôi là xong hết rồi! 🌸";
    else if (rate >= 50) message = "Cố gắng lên nào, nàng đã đi được nửa chặng đường rồi đó! 🎀";
    else if (rate > 0) message = "Bắt đầu thôi nào, mình tin nàng sẽ hoàn thành sớm thôi! ✨";
    else message = "Đừng để bài tập dồn lại nhé, hãy bắt đầu làm ngay thôi nàng ơi! 🌷";

    return { rate, message, completed, total };
  };

  const homeworkStats = getHomeworkStats();
  const todayStats = stats[stats.length - 1];
  const [quoteIndex, setQuoteIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#fff5f7] flex flex-col font-sans selection:bg-[#ffb7c5] selection:text-white relative overflow-hidden">
      <FloatingBackground />
      
      {/* Pause Warning Overlay */}
      <AnimatePresence>
        {showPauseWarning && isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/20 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white border-2 border-[#ffb7c5] rounded-[3rem] p-10 shadow-2xl max-w-md w-full text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#ffb7c5] via-[#ffdae3] to-[#ffb7c5]" />
              
              <div className="mb-6 flex justify-center">
                <div className="bg-[#fff0f3] p-6 rounded-full border-2 border-[#ffdae3] relative">
                  <AlertCircle className="w-16 h-16 text-[#ff8fa3] animate-pulse" />
                  <Heart className="absolute -top-2 -right-2 w-8 h-8 text-[#ffb7c5] fill-current animate-bounce" />
                </div>
              </div>
              
              <h2 className="text-3xl font-serif italic font-bold text-[#5c4b4e] mb-4">
                Nàng ơi, nghỉ hơi lâu rồi đó!
              </h2>
              
              <p className="text-[#8a7075] mb-8 text-lg leading-relaxed">
                Việc học đang chờ nàng quay lại hoàn thành đấy. Hãy tiếp tục để nhận thêm điểm thưởng nhé! ✨
              </p>
              
              <button
                onClick={togglePause}
                className="w-full coquette-button py-5 rounded-full text-xl flex items-center justify-center gap-3 group"
              >
                <Play className="w-6 h-6 fill-current group-hover:scale-110 transition-transform" />
                Quay lại học ngay thôi
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md border-b border-[#ffdae3] px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-[#ffb7c5] p-2 rounded-full shadow-sm">
            <Heart className="text-white w-5 h-5 fill-current" />
          </div>
          <h1 className="text-2xl font-serif italic font-bold text-[#5c4b4e]">StudyRewards</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-[#fff0f3] px-4 py-2 rounded-full border border-[#ffdae3] shadow-sm">
            <Sparkles className="text-[#ffb7c5] w-4 h-4" />
            <span className="font-bold text-[#ff8fa3]">{state.points} điểm</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-6 pb-24">
        {/* Motivational Quote Section */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/50 rounded-full border border-[#ffdae3] text-[#ff8fa3] text-sm italic font-serif">
            <Quote className="w-3 h-3" />
            <AnimatePresence mode="wait">
              <motion.span
                key={quoteIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
              >
                {QUOTES[quoteIndex]}
              </motion.span>
            </AnimatePresence>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {activeTab === 'timer' && (
            <motion.div
              key="timer"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <section className="coquette-card p-10 text-center relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute -top-10 -left-10 w-32 h-32 bg-[#ffdae3]/30 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-[#ffb7c5]/20 rounded-full blur-3xl" />
                
                <h2 className="text-xl font-serif italic text-[#8a7075] mb-2">Hôm nay nàng đã học được</h2>
                <div className="text-6xl font-serif font-bold text-[#ff7a91] mb-6 drop-shadow-sm">
                  {todayStats.minutes} <span className="text-2xl italic text-[#8a7075]">/</span> {state.dailyGoal.minutes} <span className="text-xl italic text-[#8a7075]">phút</span>
                </div>
                
                <div className="w-full bg-[#ffe4e6] h-4 rounded-full overflow-hidden mb-10 border border-[#ffdae3] p-0.5 shadow-inner">
                  <motion.div 
                    className="bg-gradient-to-r from-[#ff8fa3] to-[#ffb7c5] h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (todayStats.minutes / state.dailyGoal.minutes) * 100)}%` }}
                  />
                </div>

                {!isTimerRunning && (
                  <div className="mb-10 max-w-md mx-auto relative z-10">
                    <label className="block text-sm font-bold text-[#8a7075] mb-3 text-left flex items-center gap-2">
                      <Heart className="w-3 h-3 fill-[#ffb7c5] text-[#ffb7c5]" />
                      Nàng định học môn gì thế?
                    </label>
                    <input
                      type="text"
                      placeholder="Toán học, Văn học, hay Ngoại ngữ..."
                      value={currentSubject}
                      onChange={(e) => setCurrentSubject(e.target.value)}
                      className="w-full px-6 py-4 rounded-2xl coquette-input text-center text-lg placeholder:text-[#d1b8bc]"
                    />
                    {!currentSubject && (
                      <p className="text-xs text-[#ff8fa3] mt-3 italic">
                        * Hãy nhập môn học để bắt đầu hành trình nhé ✨
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-center relative">
                  <div className="relative inline-flex items-center justify-center p-4">
                    <svg className="w-72 h-72 transform -rotate-90 drop-shadow-sm">
                      <circle
                        cx="144"
                        cy="144"
                        r="130"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        className="text-[#ffe4e6]"
                      />
                      <motion.circle
                        cx="144"
                        cy="144"
                        r="130"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="transparent"
                        strokeDasharray={816}
                        animate={{ strokeDashoffset: isTimerRunning ? 816 * (1 - timeLeft / (selectedDuration * 60)) : 816 }}
                        className="text-[#ff8fa3]"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-7xl font-serif font-bold text-[#5c4b4e] tabular-nums tracking-tighter">
                        {isTimerRunning ? formatTime(timeLeft) : '00:00'}
                      </span>
                      <div className="mt-2 flex flex-col items-center gap-1">
                        <div className="flex items-center gap-2 text-[#ff8fa3]">
                          <Sparkles className="w-3 h-3 animate-pulse" />
                          <span className="text-[11px] font-medium italic">
                            {isTimerRunning ? (isPaused ? 'Đang tạm nghỉ...' : 'Đang tập trung miệt mài...') : 'Bắt đầu thôi nào!'}
                          </span>
                          <Sparkles className="w-3 h-3 animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex justify-center gap-4 relative z-10">
                  {!isTimerRunning ? (
                    <div className="grid grid-cols-3 gap-4 w-full max-w-lg">
                      {[15, 30, 45, 60, 90, 120].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => startTimer(mins)}
                          disabled={!currentSubject.trim()}
                          className={cn(
                            "py-4 px-4 rounded-2xl border-2 transition-all font-bold text-[#5c4b4e]",
                            currentSubject.trim() 
                              ? "border-[#ffdae3] bg-white hover:border-[#ffb7c5] hover:bg-[#fff0f3] shadow-sm" 
                              : "opacity-40 cursor-not-allowed bg-slate-50 border-transparent"
                          )}
                        >
                          {mins}p 
                          <span className="text-[#ff8fa3] text-xs block mt-1">
                            +{Math.floor(mins/15)}đ
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg justify-center">
                      <button
                        onClick={togglePause}
                        className="flex-1 bg-[#ffb7c5] hover:bg-[#ffa4b6] text-white px-8 py-5 rounded-full font-bold flex items-center justify-center gap-3 shadow-lg shadow-[#ffb7c5]/30 transition-all active:scale-95"
                      >
                        {isPaused ? (
                          <>
                            <Play className="w-5 h-5 fill-current" />
                            Tiếp tục thôi
                          </>
                        ) : (
                          <>
                            <Pause className="w-5 h-5 fill-current" />
                            Tạm dừng một chút
                          </>
                        )}
                      </button>
                      
                      <button
                        onClick={cancelTimer}
                        className="flex-1 bg-white border-2 border-[#ffdae3] text-[#ff8fa3] hover:bg-[#fff0f3] px-8 py-5 rounded-full font-bold flex items-center justify-center gap-3 shadow-sm transition-all active:scale-95"
                      >
                        <Square className="w-5 h-5 fill-current" />
                        Hủy bỏ
                      </button>
                    </div>
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'homework' && (
            <motion.div
              key="homework"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <section className="coquette-card p-10">
                <h2 className="text-3xl font-serif italic font-bold text-[#5c4b4e] mb-8">Bài Tập Về Nhà</h2>
                
                {homeworkStats && (
                  <div className="bg-gradient-to-br from-[#fff0f3] to-white p-6 rounded-[2rem] border border-[#ffdae3] shadow-sm mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-[#ff8fa3] text-sm font-bold flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        Tỉ lệ hoàn thành bài tập
                      </div>
                      <div className="text-2xl font-serif font-bold text-[#ff8fa3]">
                        {homeworkStats.rate}%
                      </div>
                    </div>
                    
                    <div className="w-full bg-[#ffdae3]/30 h-3 rounded-full overflow-hidden mb-4">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${homeworkStats.rate}%` }}
                        className="h-full bg-gradient-to-r from-[#ffb7c5] to-[#ff8fa3]"
                      />
                    </div>
                    
                    <div className="flex items-start gap-3 bg-white/50 p-3 rounded-xl border border-[#ffdae3]/50">
                      <Sparkles className="w-4 h-4 text-[#ff8fa3] shrink-0 mt-0.5" />
                      <p className="text-xs text-[#8a7075] italic leading-relaxed">
                        {homeworkStats.message}
                        <span className="block mt-1 font-bold text-[#ff8fa3]">
                          ({homeworkStats.completed}/{homeworkStats.total} bài tập)
                        </span>
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 mb-8">
                  <input
                    type="text"
                    value={newHomework}
                    onChange={(e) => setNewHomework(e.target.value)}
                    placeholder="Nhập bài tập mới..."
                    className="coquette-input px-6 py-4 rounded-2xl"
                    onKeyDown={(e) => e.key === 'Enter' && addHomework()}
                  />
                  <input
                    type="date"
                    value={newHomeworkDeadline}
                    onChange={(e) => setNewHomeworkDeadline(e.target.value)}
                    className="coquette-input px-4 py-4 rounded-2xl text-sm"
                  />
                  <button onClick={addHomework} className="coquette-button px-6 rounded-2xl h-full flex items-center justify-center">
                    <Plus className="w-6 h-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {state.homeworks.length === 0 ? (
                    <div className="text-center py-10 text-[#d1b8bc] italic">
                      Hôm nay chưa có bài tập nào đâu nàng ơi... ✨
                    </div>
                  ) : (
                    state.homeworks.map((hw) => {
                      const overdue = isOverdue(hw.deadline, hw.completed);
                      const dueToday = isDueToday(hw.deadline, hw.completed);
                      return (
                        <div key={hw.id} className="flex flex-col gap-2">
                          <div 
                            onClick={() => setExpandedHomeworkId(expandedHomeworkId === hw.id ? null : hw.id)}
                            className="flex items-center justify-between p-4 bg-white/60 rounded-2xl border border-[#ffdae3] group hover:shadow-sm transition-all cursor-pointer relative"
                          >
                            {(overdue || dueToday) && (
                              <div className={cn(
                                "absolute -top-1 -left-1 w-3 h-3 rounded-full border-2 border-white shadow-sm z-10",
                                overdue ? "bg-red-500" : "bg-orange-400"
                              )} />
                            )}
                            <div className="flex items-center gap-4 flex-1">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleHomework(hw.id);
                                }} 
                                className="text-[#ff8fa3] shrink-0"
                              >
                                {hw.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                              </button>
                              <div className="flex flex-col">
                                <span className={cn(
                                  "font-medium transition-all",
                                  hw.completed ? "text-[#d1b8bc] line-through" : "text-[#5c4b4e]"
                                )}>
                                  {hw.task}
                                </span>
                                {hw.deadline && (
                                  <span className={cn(
                                    "text-[10px] font-bold uppercase tracking-wider mt-0.5",
                                    overdue ? "text-red-500" : dueToday ? "text-orange-500" : "text-[#ff8fa3]"
                                  )}>
                                    Hạn: {new Date(hw.deadline).toLocaleDateString('vi-VN')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteHomework(hw.id);
                              }} 
                              className="text-[#d1b8bc] hover:text-[#ff8fa3] transition-all p-2 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {overdue && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="px-4 overflow-hidden"
                            >
                              <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2 text-red-600 text-xs font-medium">
                                <AlertCircle className="w-4 h-4" />
                                Bài tập này đã quá hạn rồi nàng ơi! Hãy mau chóng hoàn thành nhé ✨
                              </div>
                            </motion.div>
                          )}

                          {dueToday && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="px-4 overflow-hidden"
                            >
                              <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex items-center gap-2 text-orange-600 text-xs font-medium">
                                <TimerIcon className="w-4 h-4" />
                                Bài tập này có hạn là hôm nay đó! Nàng nhớ hoàn thành trong ngày nhé ✨
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'exams' && (
            <motion.div
              key="exams"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <section className="coquette-card p-10">
                <h2 className="text-3xl font-serif italic font-bold text-[#5c4b4e] mb-8">Lịch Thi Sắp Tới</h2>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-8">
                  <input
                    type="text"
                    value={newExamSubject}
                    onChange={(e) => setNewExamSubject(e.target.value)}
                    placeholder="Môn thi..."
                    className="coquette-input px-6 py-4 rounded-2xl"
                  />
                  <input
                    type="date"
                    value={newExamDate}
                    onChange={(e) => setNewExamDate(e.target.value)}
                    className="coquette-input px-6 py-4 rounded-2xl"
                  />
                  <input
                    type="text"
                    value={newExamTarget}
                    onChange={(e) => setNewExamTarget(e.target.value)}
                    placeholder="Mục tiêu (0-10)"
                    className="coquette-input px-6 py-4 rounded-2xl"
                  />
                  <button onClick={addExam} className="coquette-button px-6 rounded-2xl flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" /> Thêm bài thi
                  </button>
                </div>

                <div className="space-y-4">
                  {subjectAverages.length > 0 && (
                    <div className="bg-gradient-to-br from-[#fff0f3] to-white p-6 rounded-[2rem] border border-[#ffdae3] shadow-sm mb-8">
                      <div className="text-[#ff8fa3] text-sm font-bold mb-4 flex items-center gap-2">
                        <PieChart className="w-4 h-4" />
                        Điểm trung bình các môn
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {subjectAverages.map((avg) => (
                          <div key={avg.subject} className="flex flex-col p-3 bg-white rounded-2xl border border-[#ffdae3] items-center">
                            <span className="text-[10px] text-[#8a7075] font-bold uppercase">{avg.subject}</span>
                            <span className="text-xl font-serif font-bold text-[#ff8fa3]">{avg.average}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {state.exams.length === 0 ? (
                    <div className="text-center py-10 text-[#d1b8bc] italic">
                      Chưa có lịch thi nào được ghi lại...
                    </div>
                  ) : (
                    state.exams.map((exam) => {
                      const analysis = getExamAnalysis(exam);
                      const overdueNoScore = isExamOverdueWithoutScore(exam);
                      return (
                        <div key={exam.id} className="flex flex-col p-5 bg-white/60 rounded-2xl border border-[#ffdae3] gap-4 relative">
                          {overdueNoScore && (
                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-sm z-10" />
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                              <div className="bg-[#fff0f3] p-3 rounded-full">
                                <GraduationCap className="w-5 h-5 text-[#ff8fa3]" />
                              </div>
                              <div>
                                <div className="font-bold text-[#5c4b4e]">{exam.subject}</div>
                                <div className="text-xs text-[#ff8fa3] font-bold uppercase tracking-wider">{exam.date}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#ffdae3]">
                                <span className="text-xs font-bold text-[#8a7075]">Mục tiêu:</span>
                                <input
                                  type="text"
                                  value={exam.targetScore || ''}
                                  onChange={(e) => updateExamTarget(exam.id, e.target.value)}
                                  placeholder="--/10"
                                  className="w-12 bg-transparent border-none text-center font-bold text-[#ffb7c5] focus:ring-0 p-0"
                                />
                              </div>
                              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-[#ffdae3]">
                                <span className="text-xs font-bold text-[#8a7075]">Điểm:</span>
                                <input
                                  type="text"
                                  value={exam.score || ''}
                                  onChange={(e) => updateExamScore(exam.id, e.target.value)}
                                  placeholder="--/10"
                                  className="w-12 bg-transparent border-none text-center font-bold text-[#ff8fa3] focus:ring-0 p-0"
                                />
                              </div>
                              <button onClick={() => deleteExam(exam.id)} className="text-[#d1b8bc] hover:text-[#ff8fa3] transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          
                          {overdueNoScore && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="bg-red-50 p-4 rounded-xl border border-red-100 text-sm"
                            >
                              <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                <p className="text-red-600 font-medium">
                                  Nàng ơi, bài thi môn <span className="font-bold">{exam.subject}</span> đã qua ngày rồi mà chưa thấy nàng nhập điểm nè. Mau chóng cập nhật để mình theo dõi quá trình học tập của nàng nhé! ✨
                                </p>
                              </div>
                            </motion.div>
                          )}

                          {analysis && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              className="bg-[#fff0f3] p-4 rounded-xl border border-[#ffdae3] text-sm"
                            >
                              <div className="flex items-start gap-3">
                                <AlertCircle className="w-5 h-5 text-[#ff8fa3] shrink-0 mt-0.5" />
                                <div className="space-y-2">
                                  <p className="text-[#5c4b4e] font-medium">
                                    Nàng ơi, điểm số này còn thiếu <span className="text-[#ff8fa3] font-bold">{analysis.diff} điểm</span> so với mục tiêu ban đầu đấy.
                                  </p>
                                  <div className="flex items-center gap-2 text-[#8a7075] italic">
                                    <BookOpen className="w-4 h-4" />
                                    <span>Gợi ý: Nàng nên dành thêm khoảng <span className="text-[#ff8fa3] font-bold">{analysis.suggestedHours} giờ</span> học tập trung cho môn này để đạt kết quả tốt hơn nhé! ✨</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </motion.div>
          )}



          {activeTab === 'wheel' && (
            <motion.div
              key="wheel"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <section className="coquette-card p-10 flex flex-col items-center">
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-serif italic font-bold text-[#5c4b4e] mb-3">Vòng Quay Mộng Mơ</h2>
                  <p className="text-[#8a7075] italic">Dùng 1 điểm để nhận một món quà nhỏ xinh nhé! 🎀</p>
                </div>

                <div className="relative mb-16">
                  {/* Pointer */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-20 w-10 h-10 bg-[#ff8fa3] rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                    <Heart className="text-white w-5 h-5 fill-current" />
                    <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[18px] border-t-[#ff8fa3] absolute -bottom-3" />
                  </div>
                  
                  <motion.div
                    className="w-80 h-80 rounded-full border-[12px] border-white relative overflow-hidden shadow-[0_15px_50px_rgba(255,183,197,0.5)]"
                    animate={{ rotate: rotation }}
                    transition={{ duration: isSpinning ? 4 : 0, ease: "easeOut" }}
                    style={{
                      background: `conic-gradient(${state.rewards.map((r, i) => {
                        const angle = 360 / state.rewards.length;
                        return `${r.color} ${i * angle}deg ${(i + 1) * angle}deg`;
                      }).join(', ')})`
                    }}
                  >
                    {state.rewards.map((reward, i) => {
                      const angle = 360 / state.rewards.length;
                      return (
                        <div
                          key={`text-${reward.id}`}
                          className="absolute top-0 left-0 w-full h-full flex items-start justify-center pt-10"
                          style={{ transform: `rotate(${i * angle + angle/2}deg)` }}
                        >
                          <span className="text-[#5c4b4e] font-bold text-[10px] max-w-[60px] text-center leading-tight">
                            {reward.text}
                          </span>
                        </div>
                      );
                    })}
                  </motion.div>

                  <button
                    onClick={spinWheel}
                    disabled={state.points < 1 || isSpinning}
                    className={cn(
                      "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-white border-4 border-[#ffdae3] font-serif italic font-bold text-2xl text-[#ff8fa3] shadow-xl z-10 hover:scale-110 transition-transform active:scale-95 flex items-center justify-center",
                      (state.points < 1 || isSpinning) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isSpinning ? <RotateCw className="animate-spin" /> : "Quay"}
                  </button>
                </div>

                {spinResult && (
                  <motion.div
                    initial={{ scale: 0, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="bg-gradient-to-r from-[#ffb7c5] to-[#ffdae3] text-white px-8 py-4 rounded-full font-serif italic font-bold text-2xl shadow-lg mb-10 border-2 border-white"
                  >
                    Nàng nhận được: {spinResult.text} ✨
                  </motion.div>
                )}

                <div className="w-full max-w-md bg-[#fff0f3]/50 p-6 rounded-[2rem] border border-[#ffdae3]">
                  <div className="mb-6">
                    <h3 className="font-serif italic font-bold text-xl text-[#5c4b4e] mb-4">Quà tặng của nàng</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nhập món quà mới..."
                        value={newRewardText}
                        onChange={(e) => setNewRewardText(e.target.value)}
                        className="flex-1 px-4 py-2 rounded-xl coquette-input text-sm"
                        onKeyDown={(e) => e.key === 'Enter' && addReward()}
                      />
                      <button 
                        onClick={addReward}
                        className="bg-[#ffb7c5] hover:bg-[#ffa4b6] text-white p-2 rounded-xl transition-all shadow-sm"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {state.rewards.map(reward => (
                      <div key={reward.id} className="flex items-center justify-between p-4 bg-white/80 rounded-2xl border border-[#ffdae3] shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: reward.color }} />
                          <span className="font-bold text-sm text-[#5c4b4e]">{reward.text}</span>
                        </div>
                        <button 
                          onClick={() => setState(prev => ({ ...prev, rewards: prev.rewards.filter(r => r.id !== reward.id) }))}
                          className="text-[#d1b8bc] hover:text-[#ff8fa3] transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="w-full max-w-md mt-10">
                  <div className="bg-gradient-to-br from-[#fff0f3] to-white p-6 rounded-[2rem] border border-[#ffdae3] shadow-sm mb-6">
                    <div className="flex items-center gap-2 text-[#ff8fa3] text-sm font-bold mb-4">
                      <History className="w-4 h-4" />
                      Lịch sử phần thưởng
                    </div>
                    
                    <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                      {state.rewardHistory.length === 0 ? (
                        <p className="text-center py-6 text-[#d1b8bc] italic text-sm">Chưa có phần thưởng nào được ghi lại... ✨</p>
                      ) : (
                        state.rewardHistory.map((history) => (
                          <div key={history.id} className="flex items-center justify-between p-3 bg-white/60 rounded-xl border border-[#ffdae3]/50">
                            <span className="text-sm font-bold text-[#5c4b4e]">{history.rewardText}</span>
                            <span className="text-[10px] text-[#d1b8bc]">{new Date(history.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="mt-6 pt-4 border-t border-[#ffdae3]/50">
                      <div className="flex items-start gap-3 bg-[#fff0f3]/50 p-3 rounded-xl border border-[#ffdae3]/30">
                        <Sparkles className="w-4 h-4 text-[#ff8fa3] shrink-0 mt-0.5" />
                        <p className="text-xs text-[#8a7075] italic leading-relaxed">
                          Nàng ơi, hãy chăm chỉ học tập thêm để tích lũy thật nhiều điểm và nhận thêm những phần quà ngọt ngào nhé! Mỗi phút giây nỗ lực đều xứng đáng được trân trọng đó. 🌸✨
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <section className="coquette-card p-10">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-serif italic font-bold text-[#5c4b4e]">Lịch Sử Học Tập</h2>
                  {state.sessions.length > 0 && (
                    <button 
                      onClick={() => {
                        setState(prev => ({ ...prev, sessions: [] }));
                      }}
                      className="text-xs font-bold text-[#ff8fa3] hover:text-[#ff7a91] flex items-center gap-1 bg-[#fff0f3] px-3 py-2 rounded-full border border-[#ffdae3] transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Xoá hết
                    </button>
                  )}
                </div>
                {state.sessions.length === 0 ? (
                  <div className="text-center py-16 text-[#d1b8bc]">
                    <History className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="italic">Chưa có trang lịch sử nào được viết...</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {state.sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-5 bg-white/60 rounded-[1.5rem] border border-[#ffdae3] shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-5">
                          <div className="bg-[#fff0f3] text-[#ff8fa3] p-4 rounded-full border border-[#ffdae3]">
                            <Heart className="w-5 h-5 fill-current" />
                          </div>
                          <div>
                            <div className="font-serif italic font-bold text-lg text-[#5c4b4e]">{session.subject}</div>
                            <div className="text-sm text-[#ff8fa3] font-bold">{session.durationMinutes} phút học tập</div>
                            <div className="text-[10px] text-[#d1b8bc] mt-1 uppercase tracking-widest font-bold">
                              {new Date(session.timestamp).toLocaleString('vi-VN')}
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-2">
                          <div className="text-[#ffb7c5] font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            +{session.pointsEarned}đ
                          </div>
                          <button
                            onClick={() => {
                              setState(prev => ({
                                ...prev,
                                sessions: prev.sessions.filter(s => s.id !== session.id)
                              }));
                            }}
                            className="text-[#d1b8bc] hover:text-[#ff8fa3] transition-colors p-1"
                            title="Xoá dòng này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <section className="coquette-card p-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
                  <h2 className="text-3xl font-serif italic font-bold text-[#5c4b4e]">Kế Hoạch Của Nàng</h2>
                  <div className="flex items-center gap-3 bg-[#fff0f3] px-5 py-3 rounded-full border border-[#ffdae3]">
                    <span className="text-sm font-bold text-[#8a7075]">Mục tiêu:</span>
                    <input 
                      type="number" 
                      value={state.dailyGoal.minutes}
                      onChange={(e) => setState(prev => ({ ...prev, dailyGoal: { minutes: parseInt(e.target.value) || 0 } }))}
                      className="w-16 bg-transparent border-none text-center font-bold text-[#ff8fa3] focus:ring-0"
                    />
                    <span className="text-sm font-bold text-[#8a7075]">phút</span>
                  </div>
                </div>

                <div className="h-72 w-full mb-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => val.split('-').slice(2).join('/')}
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: '#8a7075', fontWeight: 'bold' }}
                      />
                      <YAxis fontSize={12} tickLine={false} axisLine={false} tick={{ fill: '#8a7075' }} />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '20px', 
                          border: '1px solid #ffdae3', 
                          boxShadow: '0 10px 25px rgba(255,183,197,0.2)',
                          backgroundColor: 'rgba(255,255,255,0.9)',
                          padding: '12px'
                        }}
                      />
                      <Bar dataKey="minutes" name="Đã học" radius={[10, 10, 0, 0]}>
                        {stats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.reached ? '#ffb7c5' : '#ffdae3'} />
                        ))}
                      </Bar>
                      <Bar dataKey="goal" name="Mục tiêu" fill="#fff0f3" radius={[10, 10, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gradient-to-br from-[#fff0f3] to-white p-6 rounded-[2rem] border border-[#ffdae3] shadow-sm">
                    <div className="text-[#ff8fa3] text-sm font-bold mb-2 flex items-center gap-2">
                      <Heart className="w-3 h-3 fill-current" />
                      Tỉ lệ hoàn thành
                    </div>
                    <div className="text-4xl font-serif font-bold text-[#5c4b4e]">
                      {Math.round((stats.filter(s => s.reached).length / stats.length) * 100)}%
                    </div>
                    <p className="text-xs text-[#8a7075] mt-2 italic">Nàng đang làm rất tốt đó! ✨</p>
                  </div>
                  <div className="bg-gradient-to-br from-[#fff0f3] to-white p-6 rounded-[2rem] border border-[#ffdae3] shadow-sm">
                    <div className="text-[#ff8fa3] text-sm font-bold mb-2 flex items-center gap-2">
                      <Sparkles className="w-3 h-3 fill-current" />
                      Tổng thời gian tuần
                    </div>
                    <div className="text-4xl font-serif font-bold text-[#5c4b4e]">
                      {stats.reduce((acc, s) => acc + s.minutes, 0)} <span className="text-xl">phút</span>
                    </div>
                    <p className="text-xs text-[#8a7075] mt-2 italic">Thật đáng tự hào quá đi! 🌸</p>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-[#ffdae3] px-2 py-4 flex justify-around items-center z-10 overflow-x-auto">
        <NavButton 
          active={activeTab === 'timer'} 
          onClick={() => setActiveTab('timer')} 
          icon={<TimerIcon />} 
          label="Học tập" 
        />
        <NavButton 
          active={activeTab === 'homework'} 
          onClick={() => setActiveTab('homework')} 
          icon={<BookOpen />} 
          label="Bài tập về nhà" 
          hasBadge={hasUrgentHomework}
        />
        <NavButton 
          active={activeTab === 'exams'} 
          onClick={() => setActiveTab('exams')} 
          icon={<GraduationCap />} 
          label="Bài thi" 
          hasBadge={hasOverdueExam}
        />

        <NavButton 
          active={activeTab === 'wheel'} 
          onClick={() => setActiveTab('wheel')} 
          icon={<RotateCw />} 
          label="Vòng quay" 
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')} 
          icon={<History />} 
          label="Lịch sử" 
        />
        <NavButton 
          active={activeTab === 'stats'} 
          onClick={() => setActiveTab('stats')} 
          icon={<PieChart />} 
          label="Kế hoạch" 
        />
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, hasBadge }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string, hasBadge?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 transition-all duration-300 min-w-[64px] relative",
        active ? "text-[#ff8fa3] scale-105 opacity-100" : "text-[#d1b8bc] hover:text-[#ffb7c5] opacity-60"
      )}
    >
      {hasBadge && (
        <div className="absolute top-1 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white z-20 shadow-sm" />
      )}
      <div className={cn(
        "p-2 rounded-2xl transition-colors",
        active && "bg-[#fff0f3]"
      )}>
        {React.cloneElement(icon as React.ReactElement, { 
          className: cn("w-6 h-6 transition-all"),
          strokeWidth: active ? 3 : 1.5
        })}
      </div>
      <span className={cn(
        "text-[9px] uppercase tracking-[0.1em] transition-all duration-300 font-inter text-center leading-tight",
        active ? "font-black text-[#ff8fa3] [text-shadow:0_0_0.5px_rgba(255,143,163,0.4)]" : "font-normal"
      )}>
        {label}
      </span>
    </button>
  );
}
