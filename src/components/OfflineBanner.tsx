"use client";

import { useMutationState } from "@tanstack/react-query";

import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { TOGGLE_NODE_COMPLETION_MUTATION_KEY } from "@/hooks/useUserTree";

export function OfflineBanner() {
  const isOnline = useOnlineStatus();

  const queuedMutations = useMutationState({
    filters: { mutationKey: [...TOGGLE_NODE_COMPLETION_MUTATION_KEY], status: "pending" },
  });

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[60] flex flex-wrap items-center justify-center gap-2 border-b border-amber-200/70 bg-amber-100/85 px-4 py-2 text-center text-sm font-semibold text-amber-900 shadow-lg shadow-amber-950/10 backdrop-blur-2xl dark:border-amber-300/20 dark:bg-amber-400/85 dark:text-amber-950"
    >
      <span>오프라인 상태입니다. 변경사항은 기기에 저장되며, 다시 연결되면 자동으로 동기화됩니다.</span>
      {queuedMutations.length > 0 ? (
        <span className="rounded-full bg-amber-950/10 px-2 py-0.5 text-xs dark:bg-amber-950/15">
          {queuedMutations.length}건 동기화 대기 중
        </span>
      ) : null}
    </div>
  );
}
