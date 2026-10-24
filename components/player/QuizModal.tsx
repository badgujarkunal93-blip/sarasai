'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Unlock,
  AlertCircle,
  Check,
} from 'lucide-react';

export interface QuizQuestionItem {
  id: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation?: string | null;
}

interface QuizModalProps {
  segmentTitle: string;
  segmentIndex: number;
  totalSegments: number;
  questions: QuizQuestionItem[];
  isOpen: boolean;
  onComplete: (passed: boolean) => void;
  onRetrySegment: () => void;
}

export function QuizModal({
  segmentTitle,
  segmentIndex,
  totalSegments,
  questions,
  isOpen,
  onComplete,
  onRetrySegment,
}: QuizModalProps) {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [attemptCount, setAttemptCount] = useState(1);
  const [isFinished, setIsFinished] = useState(false);

  if (!isOpen || !questions || questions.length === 0) return null;

  const currentQ = questions[currentQIndex];
  const isLastQuestion = currentQIndex === questions.length - 1;

  const handleSelectOption = (opt: string) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(opt);
  };

  const handleSubmitAnswer = () => {
    if (!selectedOption || isAnswerSubmitted) return;

    const isCorrect = selectedOption.trim() === currentQ.correct_answer.trim();
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
    setIsAnswerSubmitted(true);
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setIsFinished(true);
    } else {
      setCurrentQIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentQIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setAttemptCount((prev) => prev + 1);
    setIsFinished(false);
  };

  const isPassed = score >= Math.ceil(questions.length * 0.6); // 60% threshold
  const allowFallbackContinue = attemptCount >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111218]/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-w-xl w-full bg-[#FFFDF7] border-2 border-[#111218] rounded-3xl p-6 sm:p-8 shadow-neo-xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b-2 border-[#111218]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#B8FF3D] border-2 border-[#111218] flex items-center justify-center text-[#111218] shadow-neo-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="badge-black px-2 py-0.2 text-[9px] font-bold uppercase tracking-wider font-mono">
                Checkpoint · Part {segmentIndex + 1} of {totalSegments}
              </span>
              <h3 className="text-base sm:text-lg font-extrabold text-[#111218] leading-tight font-display pt-1">
                {segmentTitle}
              </h3>
            </div>
          </div>

          {!isFinished && (
            <span className="badge-lime px-2.5 py-1 text-xs font-mono font-bold">
              Q {currentQIndex + 1}/{questions.length}
            </span>
          )}
        </div>

        {/* Quiz Body */}
        {!isFinished ? (
          <div className="space-y-5">
            {/* Question Text */}
            <p className="text-sm sm:text-base font-bold text-[#111218] leading-relaxed font-display">
              {currentQ.question}
            </p>

            {/* MCQ Options */}
            <div className="space-y-2.5">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === opt;
                const isCorrect = opt.trim() === currentQ.correct_answer.trim();

                let style = 'bg-[#F5F3EC] border-2 border-[#111218] text-[#111218] hover:bg-[#FFFDF7] shadow-neo-sm';

                if (isAnswerSubmitted) {
                  if (isCorrect) {
                    style = 'bg-[#DDF6BD] border-2 border-[#111218] text-[#111218] font-bold shadow-neo-sm';
                  } else if (isSelected && !isCorrect) {
                    style = 'bg-[#FFD1C7] border-2 border-[#111218] text-[#111218] font-bold shadow-neo-sm';
                  } else {
                    style = 'bg-[#F5F3EC] border-2 border-[#111218]/30 text-[#636573] opacity-60';
                  }
                } else if (isSelected) {
                  style = 'bg-[#B8FF3D] border-2 border-[#111218] text-[#111218] font-bold shadow-neo';
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(opt)}
                    disabled={isAnswerSubmitted}
                    className={`w-full text-left p-3.5 rounded-xl text-xs sm:text-sm transition-all flex items-center justify-between gap-3 ${style}`}
                  >
                    <span>{opt}</span>
                    {isAnswerSubmitted && isCorrect && (
                      <CheckCircle2 className="w-4 h-4 text-[#111218] flex-shrink-0" />
                    )}
                    {isAnswerSubmitted && isSelected && !isCorrect && (
                      <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation card after submit */}
            {isAnswerSubmitted && currentQ.explanation && (
              <div className="p-3.5 rounded-xl bg-[#E9DFFF] border-2 border-[#111218] text-xs text-[#111218] space-y-1 shadow-neo-sm animate-in fade-in duration-150">
                <span className="font-bold uppercase tracking-wider text-[10px] font-mono block text-[#111218]">
                  Key Takeaway
                </span>
                <p className="font-medium">{currentQ.explanation}</p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {!isAnswerSubmitted ? (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!selectedOption}
                  className="neo-btn-lime px-5 py-2.5 text-xs font-bold disabled:opacity-40"
                >
                  Verify Answer
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="neo-btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-1.5"
                >
                  <span>{isLastQuestion ? 'View Results' : 'Next Question'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#B8FF3D]" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Finished State */
          <div className="space-y-6 text-center py-4">
            <div
              className={`w-14 h-14 rounded-2xl border-2 border-[#111218] flex items-center justify-center mx-auto shadow-neo-sm ${
                isPassed ? 'bg-[#B8FF3D] text-[#111218]' : 'bg-[#FFD1C7] text-[#111218]'
              }`}
            >
              {isPassed ? <Check className="w-8 h-8" /> : <AlertCircle className="w-8 h-8" />}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-extrabold text-[#111218] font-display uppercase">
                {isPassed ? 'Checkpoint Passed!' : 'Need a Little Review'}
              </h3>
              <p className="text-xs text-[#636573] font-medium max-w-sm mx-auto">
                {isPassed
                  ? `You got ${score} of ${questions.length} questions correct. The next chapter is now unlocked!`
                  : `You scored ${score}/${questions.length}. Re-watch this part or retry to lock in comprehension.`}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              {isPassed ? (
                <button
                  onClick={() => onComplete(true)}
                  className="neo-btn-lime px-6 py-3 text-xs font-bold flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4 text-[#111218]" />
                  <span>Unlock & Continue Next Part</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={handleRestartQuiz}
                    className="neo-btn-lime px-4 py-2.5 text-xs font-bold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Retry Quiz</span>
                  </button>

                  <button
                    onClick={() => {
                      onRetrySegment();
                    }}
                    className="neo-btn-outline px-4 py-2.5 text-xs font-bold"
                  >
                    Rewatch Segment
                  </button>

                  {allowFallbackContinue && (
                    <button
                      onClick={() => onComplete(false)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-[#636573] hover:text-[#111218] underline"
                    >
                      Review & Continue anyway
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
