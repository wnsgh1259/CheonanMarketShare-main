export function formatPhoneDisplay(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    if (digits.startsWith("02")) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
    }
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 9 && digits.startsWith("02")) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  }
  return phone;
}

export function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("02")) {
    const sliced = digits.slice(0, 10);
    if (sliced.length <= 2) return sliced;
    if (sliced.length <= 5) return `${sliced.slice(0, 2)}-${sliced.slice(2)}`;
    if (sliced.length <= 9) return `${sliced.slice(0, 2)}-${sliced.slice(2, 5)}-${sliced.slice(5)}`;
    return `${sliced.slice(0, 2)}-${sliced.slice(2, 6)}-${sliced.slice(6)}`;
  }

  const sliced = digits.slice(0, 11);
  if (sliced.length <= 3) return sliced;
  if (sliced.length <= 7) return `${sliced.slice(0, 3)}-${sliced.slice(3)}`;
  return `${sliced.slice(0, 3)}-${sliced.slice(3, 7)}-${sliced.slice(7)}`;
}
