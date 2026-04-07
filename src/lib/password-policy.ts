import { z } from 'zod';

export const PASSWORD_POLICY_SUMMARY =
  'Use 8+ characters with uppercase, lowercase, number, and special character.';

export const COMMON_PASSWORD_MESSAGE =
  'This password is too common. Please choose a stronger password.';

const COMMON_WEAK_PASSWORDS = new Set([
  '123123123',
  'password',
  'admin123',
  '12345678',
  'qwerty123',
]);

export const PASSWORD_REQUIREMENTS = [
  {
    id: 'length',
    label: '8+ characters',
    message: 'Password must be at least 8 characters long.',
    test: (password: string) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'At least 1 uppercase letter',
    message: 'Password must include at least one uppercase letter.',
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'At least 1 lowercase letter',
    message: 'Password must include at least one lowercase letter.',
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'At least 1 number',
    message: 'Password must include at least one number.',
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: 'special',
    label: 'At least 1 special character',
    message: 'Password must include at least one special character.',
    test: (password: string) => /[^A-Za-z0-9\s]/.test(password),
  },
  {
    id: 'common',
    label: 'Not a common weak password',
    message: COMMON_PASSWORD_MESSAGE,
    test: (password: string) => password.length > 0 && !COMMON_WEAK_PASSWORDS.has(password),
  },
] as const;

export function getPasswordRequirementStatuses(password: string) {
  return PASSWORD_REQUIREMENTS.map((requirement) => ({
    ...requirement,
    met: requirement.test(password),
  }));
}

export function getPasswordValidationMessages(password: string) {
  const statuses = getPasswordRequirementStatuses(password);
  const commonRequirement = statuses.find((status) => status.id === 'common');
  const baseMessages = statuses
    .filter((status) => status.id !== 'common' && !status.met)
    .map((status) => status.message);

  if (commonRequirement && !commonRequirement.met) {
    return [commonRequirement.message, ...baseMessages];
  }

  return baseMessages;
}

export function getPasswordValidationMessage(password: string) {
  return getPasswordValidationMessages(password)[0] ?? null;
}

export const strongPasswordSchema = z
  .string()
  .min(1, 'Password is required.')
  .superRefine((password, ctx) => {
    if (!password) {
      return;
    }

    const firstMessage = getPasswordValidationMessage(password);
    if (firstMessage) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: firstMessage,
      });
    }
  });
