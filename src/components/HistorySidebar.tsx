'use client';

import React from 'react';
import {
  X,
  Plus,
  MessageSquare,
  Trash2,
  Clock,
  LogIn,
  LogOut,
  User,
  Sparkles,
} from 'lucide-react';
import { ChatSession, UserProfile } from '@/lib/types';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (session: ChatSession) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
  onOpenAuthModal: () => void;
  onOpenProfile: () => void;
  onLogout: () => void;
  userArchetype?: string;
}

export function HistorySidebar({
  isOpen,
  onClose,
  currentUser,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onOpenAuthModal,
  onOpenProfile,
  onLogout,
  userArchetype,
}: HistorySidebarProps) {
  if (!isOpen) return null;

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const hours = d.getHours();
      const mins = d.getMinutes().toString().padStart(2, '0');
      const period = hours >= 12 ? '오후' : '오전';
      const dispHours = hours % 12 === 0 ? 12 : hours % 12;
      return `${month}월 ${day}일 ${period} ${dispHours}:${mins}`;
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-80 max-w-[85vw] bg-white h-full shadow-2xl flex flex-col z-10 border-r border-slate-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-purple-700 p-0.5 shadow-2xs flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center p-1 text-indigo-600">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="w-full h-full text-indigo-600"
                >
                  <path d="M3 20h18" />
                  <path d="M4 17h16" />
                  <path d="M6 17V8" />
                  <path d="M10 17V8" />
                  <path d="M14 17V8" />
                  <path d="M18 17V8" />
                  <path d="M2 7l10-4 10 4" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">상담 기록</h2>
              <p className="text-[11px] text-slate-400">지난 고민과 토론 다시보기</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-3">
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full py-2.5 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <Plus size={15} />
            <span>새 상담 시작하기</span>
          </button>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Clock size={24} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs text-slate-500 font-medium">저장된 상담 내역이 없습니다</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                고민을 나누시면 대화가 자동으로 저장됩니다
              </p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = session.id === currentSessionId;
              return (
                <div
                  key={session.id}
                  onClick={() => {
                    onSelectSession(session);
                    onClose();
                  }}
                  className={`group relative p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    isActive
                      ? 'bg-indigo-50/80 border-indigo-200 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <MessageSquare
                      size={15}
                      className={`shrink-0 mt-0.5 ${
                        isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    />
                    <div className="flex-1 min-w-0 pr-6">
                      <p
                        className={`text-xs font-medium truncate ${
                          isActive ? 'text-indigo-950 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        {session.title || '새로운 상담'}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1">
                        {formatDate(session.updatedAt || session.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('이 상담 기록을 삭제하시겠습니까?')) {
                        onDeleteSession(session.id);
                      }
                    }}
                    className="absolute right-2.5 top-3 p-1 rounded-md text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="상담 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* User Account Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/80 pb-safe">
          {currentUser ? (
            <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-indigo-600 font-medium truncate">
                    {userArchetype ? `🧭 ${userArchetype}` : currentUser.email}
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                title="로그아웃"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-2.5 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 leading-snug">
                로그인하시면 기기를 바꾸어도 지난 상담 기록을 그대로 불러올 수 있습니다.
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenAuthModal();
                }}
                className="w-full py-2 px-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
              >
                <LogIn size={13} />
                <span>로그인 / 회원가입</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
