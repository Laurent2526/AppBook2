"use client";

type Props = {
  token: string;
  onChange: (value: string) => void;
};

export function AdminTokenField({ token, onChange }: Props) {
  return (
    <input
      className="management-token"
      type="password"
      placeholder="Admin access token"
      value={token}
      onChange={(event) => onChange(event.target.value)}
      autoComplete="off"
    />
  );
}
