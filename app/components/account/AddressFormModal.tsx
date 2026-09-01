import React, { useState, useEffect } from 'react';
import { useFetcher } from 'react-router';
import { Modal } from '~/components/ui/Modal';
import { Input } from '~/components/ui/Input';
import { Button } from '~/components/ui/Button';
import { IndianAddressFields } from '~/components/address/IndianAddressFields';
import { User, Phone, MapPin, Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

export interface AddressFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  address?: {
    id?: string;
    firstName?: string;
    lastName?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
    phone?: string;
    isDefault?: boolean;
  };
  onSuccess?: () => void;
}

export const AddressFormModal: React.FC<AddressFormModalProps> = ({
  isOpen,
  onClose,
  mode,
  address,
  onSuccess,
}) => {
  const fetcher = useFetcher<{
    success?: boolean;
    message?: string;
    error?: string;
  }>();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [pincode, setPincode] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('');
  const [phone, setPhone] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && address) {
        setFirstName(address.firstName || '');
        setLastName(address.lastName || '');
        setAddress1(address.address1 || '');
        setAddress2(address.address2 || '');
        setPincode(address.zip || '');
        setCity(address.city || '');
        setProvince(address.province || '');
        setPhone(address.phone || '');
        setIsDefault(Boolean(address.isDefault));
      } else {
        setFirstName('');
        setLastName('');
        setAddress1('');
        setAddress2('');
        setPincode('');
        setCity('');
        setProvince('');
        setPhone('');
        setIsDefault(false);
      }
      setIsDeleting(false);
    }
  }, [isOpen, mode, address]);

  const isSubmitting = fetcher.state !== 'idle';
  const isSuccess = fetcher.data?.success === true;
  const errorMessage = fetcher.data?.error;

  useEffect(() => {
    if (isSuccess) {
      const timer = setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess, onClose, onSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address1.trim() || isSubmitting) return;

    fetcher.submit(
      {
        intent: mode === 'edit' ? 'edit' : 'add',
        addressId: address?.id || '',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        address1: address1.trim(),
        address2: address2.trim(),
        zip: pincode.trim(),
        city: city.trim(),
        province: province.trim(),
        phone: phone.trim(),
        isDefault: isDefault ? 'true' : 'false',
      },
      { method: 'POST', action: '/api/account/address' },
    );
  };

  const handleDelete = () => {
    if (!address?.id || isSubmitting) return;
    if (confirm('Are you sure you want to remove this saved address?')) {
      setIsDeleting(true);
      fetcher.submit(
        { intent: 'delete', addressId: address.id },
        { method: 'POST', action: '/api/account/address' },
      );
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === 'add' ? 'Add New Shipping Address' : 'Edit Shipping Address'}
      maxWidth="lg"
    >
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
            <span>{fetcher.data?.message || 'Address saved successfully!'}</span>
          </div>
        )}

        {/* Name Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Recipient's first name"
            startIcon={<User className="w-4 h-4 text-[#686764]" />}
            disabled={isSubmitting}
          />
          <Input
            label="Last Name"
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Recipient's last name"
            disabled={isSubmitting}
          />
        </div>

        {/* Address Lines */}
        <Input
          label="Street Address / Building / Flat *"
          type="text"
          required
          value={address1}
          onChange={(e) => setAddress1(e.target.value)}
          placeholder="e.g. Flat 402, Lotus Residency, MG Road"
          startIcon={<MapPin className="w-4 h-4 text-[#686764]" />}
          disabled={isSubmitting}
        />

        <Input
          label="Apartment, Suite, Landmark (optional)"
          type="text"
          value={address2}
          onChange={(e) => setAddress2(e.target.value)}
          placeholder="e.g. Near HDFC Bank"
          disabled={isSubmitting}
        />

        {/* Pincode, City, State with Auto-lookup */}
        <IndianAddressFields
          initialPincode={pincode}
          initialCity={city}
          initialState={province}
          onLocationChange={(loc) => {
            setPincode(loc.pincode);
            setCity(loc.city);
            setProvince(loc.state);
          }}
        />

        {/* Phone */}
        <Input
          label="Delivery Phone Number"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 98765 43210"
          helperText="Used by couriers for dispatch SMS and delivery coordination"
          startIcon={<Phone className="w-4 h-4 text-[#686764]" />}
          disabled={isSubmitting}
        />

        {/* Set as Default Checkbox */}
        <label className="flex items-center gap-2.5 pt-2 text-xs font-medium text-[#060505] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            disabled={isSubmitting}
            className="w-4 h-4 rounded border-[#e8e4df] text-[#c4622d] focus:ring-[#c4622d] accent-[#c4622d] cursor-pointer"
          />
          <span>Set as default shipping address for checkout</span>
        </label>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#e8e4df]">
          {mode === 'edit' ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? 'Deleting...' : 'Delete Address'}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
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
              disabled={isSubmitting || !address1.trim()}
              className="cursor-pointer flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{mode === 'add' ? 'Save Address' : 'Update Address'}</span>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
