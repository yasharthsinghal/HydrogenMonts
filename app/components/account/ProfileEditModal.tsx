import React, { useState, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { Modal } from '~/components/ui/Modal';
import { Input } from '~/components/ui/Input';
import { Button } from '~/components/ui/Button';
import { User, Phone, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFirstName?: string;
  initialLastName?: string;
  initialPhone?: string;
  onSuccess?: () => void;
}

export const ProfileEditModal: React.FC<ProfileEditModalProps> = ({
  isOpen,
  onClose,
  initialFirstName = '',
  initialLastName = '',
  initialPhone = '',
  onSuccess,
}) => {
  const fetcher = useFetcher<{
    success?: boolean;
    message?: string;
    error?: string;
    customer?: any;
  }>();

  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [phone, setPhone] = useState(initialPhone);

  useEffect(() => {
    if (isOpen) {
      setFirstName(initialFirstName);
      setLastName(initialLastName);
      setPhone(initialPhone);
    }
  }, [isOpen, initialFirstName, initialLastName, initialPhone]);

  const isSubmitting = fetcher.state !== 'idle';
  const isSuccess = fetcher.data?.success === true;
  const errorMessage = fetcher.data?.error;

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose, onSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) return;

    fetcher.submit(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      },
      { method: 'POST', action: '/api/account/profile' },
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Profile Details" maxWidth="md">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMessage && (
          <div className="flex items-center gap-2 p-3 rounded-[6px] bg-rose-50 border border-rose-200 text-rose-800 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isSuccess && (
          <div className="flex items-center gap-2 p-3 rounded-[6px] bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{fetcher.data?.message || 'Profile updated successfully!'}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name *"
            name="firstName"
            type="text"
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First Name"
            startIcon={<User className="w-4 h-4 text-[#686764]" />}
            disabled={isSubmitting}
          />
          <Input
            label="Last Name"
            name="lastName"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last Name"
            disabled={isSubmitting}
          />
        </div>

        <Input
          label="Contact Number"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          helperText="Include country code (+91) for SMS order notifications"
          startIcon={<Phone className="w-4 h-4 text-[#686764]" />}
          disabled={isSubmitting}
        />

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#e8e4df]">
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
            disabled={isSubmitting || !firstName.trim()}
            className="cursor-pointer flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
