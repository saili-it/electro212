"use client";

import { startTransition, type FormEvent, type ReactNode } from "react";

/**
 * Submits through useActionState's dispatcher from onSubmit instead of the
 * `action` prop: React 19 auto-resets uncontrolled fields after an `action`
 * prop submission, which would wipe the admin's input on a validation error.
 */
export function ActionForm({
  dispatch,
  children,
  className,
}: {
  dispatch: (formData: FormData) => void;
  children: ReactNode;
  className?: string;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
    </form>
  );
}
