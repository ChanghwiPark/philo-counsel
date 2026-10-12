'use client';

import React, { useState } from 'react';
import {
  X,
  Lock,
  Mail,
  User,
  LogIn,
  UserPlus,
  Sparkles,
  AlertCircle,
  CloudUpload,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import {
  firebaseLogin,
  firebaseSignup,
  firebaseDemoLogin,
  getLocalDataToMigrate,
  migrateLocalDataToFirestore,
  skipLocalDataMigration,
  LocalDataSummary,
} from '@/lib/auth';
import { UserProfile } from '@/lib/types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Migration Step State
  const [pendingUser, setPendingUser] = useState<UserProfile | null>(null);
  const [migrationData, setMigrationData] = useState<LocalDataSummary | null>(null);
  const [showSkipWarning, setShowSkipWarning] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationSuccess, setMigrationSuccess] = useState(false);

  if (!isOpen) return null;

  const handleAuthCompleted = (user: UserProfile) => {
    // Check if there is local data on this machine to migrate to the new Cloud Firestore account
    const localData = getLocalDataToMigrate(user.id);
    if (localData.hasData) {
      setPendingUser(user);
      setMigrationData(localData);
    } else {
      onAuthSuccess(user);
      onClose();
    }
  };

  const getFirebaseErrorMessage = (err: any): string => {
    const code = err?.code || '';
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return '이메일 또는 비밀번호가 올바르지 않습니다.';
      case 'auth/email-already-in-use':
        return '이미 등록된 이메일입니다. 로그인 탭을 이용해 주세요.';
      case 'auth/weak-password':
        return '비밀번호는 최소 6자 이상이어야 합니다.';
      case 'auth/invalid-email':
        return '올바른 이메일 주소 형식을 입력해 주세요.';
      case 'auth/network-request-failed':
        return '네트워크 연결 상태를 확인해 주세요.';
      default:
        return err.message || '인증 처리 중 오류가 발생했습니다.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('이메일과 비밀번호를 모두 입력해 주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        const user = await firebaseLogin(email, password);
        handleAuthCompleted(user);
      } else {
        if (!name.trim()) {
          setError('닉네임을 입력해 주세요.');
          setIsSubmitting(false);
          return;
        }
        const user = await firebaseSignup(email, password, name);
        handleAuthCompleted(user);
      }
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      const demo = await firebaseDemoLogin();
      handleAuthCompleted(demo);
    } catch (err: any) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExecuteMigration = async () => {
    if (!pendingUser) return;
    setIsMigrating(true);
    try {
      await migrateLocalDataToFirestore(pendingUser.id);
      setMigrationSuccess(true);
      setTimeout(() => {
        onAuthSuccess(pendingUser);
        onClose();
      }, 1100);
    } catch (e: any) {
      setError('데이터 이전 중 일부 오류가 발생했습니다: ' + (e.message || ''));
      onAuthSuccess(pendingUser);
      onClose();
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkipMigrationConfirmed = () => {
    if (!pendingUser) return;
    skipLocalDataMigration(pendingUser.id);
    onAuthSuccess(pendingUser);
    onClose();
  };

  // -------------------------------------------------------------
  // Render: Local Data Migration View
  // -------------------------------------------------------------
  if (pendingUser && migrationData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-md w-full p-6 sm:p-7 relative overflow-hidden">
          {/* Header */}
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3 shadow-xs">
              <CloudUpload size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg sm:text-xl">
              기존 상담 기록 클라우드 동기화
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              이 기기에 저장되어 있던 기존 데이터를 새 Firebase 계정에 안전하게 통합합니다
            </p>
          </div>

          {/* Stats Card */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 mb-4">
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center justify-between">
              <span>발견된 로컬 데이터</span>
              <span className="text-indigo-600 font-bold">통합 가능</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-2xs">
                <span className="block text-xl font-bold text-slate-900">
                  {migrationData.sessionsCount}개
                </span>
                <span className="text-[11px] text-slate-500">대화 세션 기록</span>
              </div>
              <div className="bg-white rounded-xl p-3 border border-slate-200/60 shadow-2xs">
                <span className="block text-xl font-bold text-indigo-700">
                  {migrationData.reactionsCount}개
                </span>
                <span className="text-[11px] text-slate-500">철학 가치관 공감</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              💡 클라우드로 가져오면 휴대폰, 노트북, 태블릿 등 다른 기기에서도 언제든 실시간으로 동일하게 대화를 이어갈 수 있습니다.
            </p>
          </div>

          {/* Success State */}
          {migrationSuccess && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 animate-fade-in font-medium">
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
              <span>성공적으로 클라우드에 통합되었습니다! 상담소로 이동합니다...</span>
            </div>
          )}

          {/* Skip Warning Alert */}
          {showSkipWarning && !migrationSuccess && (
            <div className="mb-4 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs animate-fade-in space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed font-normal">
                  <strong>주의:</strong> 지금 건너뛰시면 이 브라우저의 기존 상담 기록은 클라우드 계정에 보관되지 않으며, 다른 기기에서는 조회할 수 없습니다.
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setShowSkipWarning(false)}
                  className="px-3 py-1 rounded-lg bg-white border border-amber-300 text-amber-800 text-[11px] font-semibold hover:bg-amber-100/50"
                >
                  돌아가기
                </button>
                <button
                  type="button"
                  onClick={handleSkipMigrationConfirmed}
                  className="px-3 py-1 rounded-lg bg-amber-600 text-white text-[11px] font-semibold hover:bg-amber-700 shadow-2xs"
                >
                  데이터 없이 건너뛰기
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!migrationSuccess && !showSkipWarning && (
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleExecuteMigration}
                disabled={isMigrating}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
              >
                {isMigrating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>클라우드로 안전하게 이전 중...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload size={16} />
                    <span>지금 클라우드로 가져오기</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowSkipWarning(true)}
                disabled={isMigrating}
                className="w-full py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-medium text-xs transition-colors cursor-pointer"
              >
                나중에 하기 (건너뛰기)
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // Render: Standard Login / Signup View
  // -------------------------------------------------------------
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-md w-full p-6 sm:p-7 relative overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-xl hover:bg-slate-100"
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3 shadow-xs">
            {mode === 'login' ? <LogIn size={22} /> : <UserPlus size={22} />}
          </div>
          <h3 className="font-bold text-slate-900 text-lg sm:text-xl">
            {mode === 'login' ? '철학 상담소 로그인' : '새 계정 만들기'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            로그인하시면 모든 기기(스마트폰, PC)에서 상담 기록이 실시간으로 동기화됩니다
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">닉네임</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 지혜를 찾는 이"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">이메일</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@counselor.kr"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">비밀번호</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 (6자 이상)"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-3 rounded-xl bg-slate-900 text-white font-medium text-xs sm:text-sm hover:bg-slate-800 transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>처리 중...</span>
              </>
            ) : mode === 'login' ? (
              '로그인하기'
            ) : (
              '회원가입 완료'
            )}
          </button>
        </form>

        {/* Demo Fast Login */}
        <div className="mt-5 pt-4 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isSubmitting}
            className="w-full py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/70 text-indigo-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <Sparkles size={14} />
            <span>데모 계정으로 원클릭 체험하기</span>
          </button>
        </div>
      </div>
    </div>
  );
}
