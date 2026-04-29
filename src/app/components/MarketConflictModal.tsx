interface MarketConflictModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function MarketConflictModal({ open, onConfirm, onCancel }: MarketConflictModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="text-center text-[15px] text-gray-900 mb-2">시장을 변경할까요?</h3>
        <p className="text-[13px] text-gray-500 text-center mb-6 leading-relaxed">
          장바구니에는 같은 시장의 상품만 담을 수 있어요.
          <br />
          변경하면 기존 상품이 삭제됩니다.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-[14px] active:bg-gray-200 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl bg-gray-900 text-white text-[14px] active:bg-gray-800 transition-colors"
          >
            변경하기
          </button>
        </div>
      </div>
    </div>
  );
}
