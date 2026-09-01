import React, { useState, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { Modal } from '~/components/ui/Modal';
import { Input } from '~/components/ui/Input';
import { Button } from '~/components/ui/Button';
import {
  Mail,
  KeyRound,
  ShieldCheck,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export interface EmailChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  onSuccess?: (newEmail: string) => void;
}

export const EmailChangeModal: React.FC<EmailChangeModalProps> = ({
  isOpen,
  onClose,
  currentEmail,
  onSuccess,
}) => {
  const fetcher = useFetcher<{
    success?: boolean;
    step?: 'input' | 'verify' | 'completed';
    newEmail?: string;
    message?: string;
    error?: string;
  }>();

  const [step, setStep] = useState<'input' | 'verify'>('input');
  const [newEmail, setNewEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setNewEmail('');
      setOtpCode('');
      setResendCooldown(0);
    }
  }, [isOpen]);

  useEffect(() => {
    let interval: any = null;
    if (resendCooldown > 0) {
      interval = setInterval(() => {
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendCooldown]);

  useEffect(() => {
    if (fetcher.data?.step === 'verify') {
      setStep('verify');
      if (fetcher.data.newEmail) setNewEmail(fetcher.data.newEmail);
      setResendCooldown(60);
    } else if (fetcher.data?.step === 'completed' && fetcher.data?.success) {
      const updatedEmail = fetcher.data.newEmail || newEmail;
      const timer = setTimeout(() => {
        onSuccess?.(updatedEmail);
        onClose();
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [fetcher.data, newEmail, onClose, onSuccess]);

  const isSubmitting = fetcher.state !== 'idle';
  const errorMessage = fetcher.data?.error;
  const isSuccess = fetcher.data?.success === true && fetcher.data?.step === 'completed';

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes('@') || isSubmitting) return;

    fetcher.submit(
      { intent: 'send_otp', newEmail: newEmail.trim() },
      { method: 'POST', action: '/api/account/email-change' },
    );
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6 || isSubmitting) return;

    fetcher.submit(
      { intent: 'verify_otp', newEmail: newEmail.trim(), code: otpCode.trim() },
      { method: 'POST', action: '/api/account/email-change' },
    );
  };

  const handleResend = () => {
    if (resendCooldown > 0 || isSubmitting) return;
    fetcher.submit(
      { intent: 'send_otp', newEmail: newEmail.trim() },
      { method: 'POST', action: '/api/account/email-change' },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change Account Email" maxWidth="md">
      <div className="flex flex-col gap-4">
        {/* Step Indicator */}
        <div className="flex items-center justify-between px-1 pb-2 border-b border-[#e8e4df] text-xs">
          <span className="text-[#686764]">
            Current: <strong className="text-[#060505]">{currentEmail}</strong>
          </span>
          <span className="font-semibold text-[#c4622d]">
            {step === 'input' ? 'Step 1 of 2: New Email' : 'Step 2 of 2: Verification'}
          </span>
        </div>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Email updated to {newEmail}! Refreshing...</span>
          </div>
        )}

        {step === 'input' && !isSuccess && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <p className="text-xs text-[#686764] leading-relaxed">
              To protect your account, a 6-digit verification code will be sent to your new email address before updating.
            </p>

            <Input
              label="New Email Address *"
              type="email"
              required
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="e.g. newaddress@example.com"
              startIcon={<Mail className="w-4 h-4 text-[#686764]" />}
              disabled={isSubmitting}
            />

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e8e4df]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || !newEmail.trim() || newEmail === currentEmail}
                className="cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <>
                    <span>Send Verification Code</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 'verify' && !isSuccess && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="p-3 bg-[#faf8f5] rounded-[6px] border border-[#e8e4df] text-xs text-[#686764]">
              <p className="font-semibold text-[#060505] mb-0.5">Verification code sent!</p>
              <p>
                Enter the 6-digit code sent to <strong className="text-[#c4622d]">{newEmail}</strong>.
              </p>
            </div>

            <Input
              label="6-Digit Verification Code *"
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              startIcon={<KeyRound className="w-4 h-4 text-[#686764]" />}
              disabled={isSubmitting}
            />

            <div className="flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setStep('input')}
                disabled={isSubmitting}
                className="text-[#686764] hover:text-[#060505] underline cursor-pointer"
              >
                Edit new email
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || isSubmitting}
                className="flex items-center gap-1 text-[#c4622d] hover:text-[#923f12] disabled:opacity-50 cursor-pointer font-medium"
              >
                <RefreshCw className={`w-3 h-3 ${isSubmitting ? 'animate-spin' : ''}`} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e8e4df]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || otpCode.length !== 6}
                className="cursor-pointer flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify & Update Email</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
