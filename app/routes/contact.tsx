import React, { useState } from 'react';
import { data, useFetcher, type MetaFunction, type ActionFunctionArgs } from 'react-router';
import { Breadcrumb } from '~/components/ui/Breadcrumb';
import { Input } from '~/components/ui/Input';
import { Button } from '~/components/ui/Button';
import { FormOverlayLoader } from '~/components/ui/FormOverlayLoader';
import { Phone, Mail, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { getHydrogenContext } from '~/lib/context.server';
import { dispatchContactInquiryEmail } from '~/services/email/dispatcher.server';

export const meta: MetaFunction = () => {
  return [
    { title: 'Contact Us | MONTS' },
    { name: 'description', content: 'Get in touch with the MONTS customer care and concierge team.' },
  ];
};

const MAX_SUBJECT_WORDS = 20;

export async function action({ request, context }: ActionFunctionArgs) {
  const { env } = await getHydrogenContext(context, request);
  const formData = await request.formData();

  const fullName = (formData.get('fullName') as string)?.trim() || '';
  const email = (formData.get('email') as string)?.trim() || '';
  const phone = (formData.get('phone') as string)?.trim() || '';
  const subject = (formData.get('subject') as string)?.trim() || '';
  const message = (formData.get('message') as string)?.trim() || '';

  // Server-side validation
  if (!fullName || fullName.length < 2) {
    return data({ error: 'Please provide your full name (at least 2 characters).' }, { status: 400 });
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!email || !emailRegex.test(email)) {
    return data({ error: 'Please provide a valid email address (e.g. name@domain.com).' }, { status: 400 });
  }

  const digitsOnly = phone.replace(/\D/g, '');
  if (!phone || digitsOnly.length < 7 || digitsOnly.length > 15) {
    return data({ error: 'Please provide a valid contact number (7-15 digits).' }, { status: 400 });
  }

  if (!subject || subject.length < 3) {
    return data({ error: 'Please provide a subject (at least 3 characters).' }, { status: 400 });
  }

  if (!message || message.length < 10) {
    return data({ error: 'Please provide a message (at least 10 characters).' }, { status: 400 });
  }

  // Recipient email address - Configured via CONTACT_EMAIL_RECIPIENT in .env / runtime environment
  const recipientEmail = env.CONTACT_EMAIL_RECIPIENT || 'yasharth.singhal@startapps.com';

  const dispatchResult = await dispatchContactInquiryEmail(
    {
      to: recipientEmail,
      fullName,
      email,
      phone,
      subject,
      message,
    },
    env,
  );

  if (!dispatchResult.success) {
    return data(
      {
        error: `Unable to dispatch message: ${dispatchResult.error || 'Server error'}. Please reach out via WhatsApp or email directly.`,
      },
      { status: 500 },
    );
  }

  return data({
    success: true,
    payload: {
      fullName,
      email,
      phone,
      subject,
    },
  });
}

export default function ContactRoute() {
  const fetcher = useFetcher<{
    success?: boolean;
    error?: string;
    payload?: {
      fullName: string;
      email: string;
      phone: string;
      subject: string;
    };
  }>();

  const isSubmitting = fetcher.state === 'submitting';
  const isSuccess = fetcher.data?.success === true;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const countWords = (text: string) => {
    return text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  };

  const validateField = (name: string, value: string): string => {
    const trimmed = value.trim();
    switch (name) {
      case 'fullName':
        if (!trimmed) return 'Full name is required.';
        if (trimmed.length < 2) return 'Full name must be at least 2 characters.';
        return '';

      case 'email':
        if (!trimmed) return 'Email address is required.';
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(trimmed)) {
          return 'Please enter a valid email address (e.g. name@domain.com).';
        }
        return '';

      case 'phone':
        if (!trimmed) return 'Contact number is required.';
        const digitsOnly = trimmed.replace(/\D/g, '');
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{7,15}$/;
        if (!phoneRegex.test(trimmed) || digitsOnly.length < 7 || digitsOnly.length > 15) {
          return 'Please enter a valid contact number (7-15 digits).';
        }
        return '';

      case 'subject':
        if (!trimmed) return 'Subject is required.';
        const wordCount = countWords(trimmed);
        if (wordCount > MAX_SUBJECT_WORDS) {
          return `Subject cannot exceed ${MAX_SUBJECT_WORDS} words (currently ${wordCount} words).`;
        }
        if (trimmed.length < 3) {
          return 'Subject must be at least 3 characters.';
        }
        return '';

      case 'message':
        if (!trimmed) return 'Message is required.';
        if (trimmed.length < 10) return 'Message must be at least 10 characters.';
        return '';

      default:
        return '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (touched[name]) {
      const error = validateField(name, value);
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    Object.keys(formData).forEach((key) => {
      newTouched[key] = true;
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) newErrors[key] = error;
    });

    setTouched(newTouched);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return;
    }

    const payload = new FormData();
    payload.append('fullName', formData.fullName.trim());
    payload.append('email', formData.email.trim());
    payload.append('phone', formData.phone.trim());
    payload.append('subject', formData.subject.trim());
    payload.append('message', formData.message.trim());

    fetcher.submit(payload, { method: 'post' });
  };

  const handleReset = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      subject: '',
      message: '',
    });
    setTouched({});
    setErrors({});
    // Reset fetcher state by submitting empty or resetting formData
    fetcher.data = undefined;
  };

  const subjectWordCount = countWords(formData.subject);
  const submittedPayload = fetcher.data?.payload;

  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12">
      <Breadcrumb items={[{ label: 'Contact Us' }]} className="mb-8" />

      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs uppercase tracking-[0.25em] font-semibold text-[#8b7355] block mb-2">
            Get In Touch
          </span>
          <h1
            className="text-4xl md:text-5xl font-bold text-[#060505]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            We Would Love to Hear From You
          </h1>
          <p
            className="text-base text-[#686764] mt-3"
            style={{ fontFamily: "'Cormorant', serif", fontSize: '1.2rem' }}
          >
            Have a question about sizing, custom inquiries, or orders? Reach out below.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Info Column */}
          <div className="flex flex-col gap-6 p-6 bg-[#faf8f5] rounded-[6px] border border-[#e8e4df]">
            <h3 className="text-lg font-bold text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
              Concierge Details
            </h3>

            <div className="flex items-start gap-3 text-sm text-[#2c2c2c]">
              <Phone className="w-4 h-4 text-[#c4622d] shrink-0 mt-1" />
              <div>
                <span className="font-semibold block">Phone / WhatsApp</span>
                <a href="tel:+918290985337" className="text-[#686764] hover:text-[#c4622d] block">
                  +91 - 8290985337
                </a>
                <a
                  href="https://wa.me/918290985337"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#25D366] font-medium hover:underline block mt-0.5"
                >
                  Chat on WhatsApp
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm text-[#2c2c2c]">
              <Mail className="w-4 h-4 text-[#c4622d] shrink-0 mt-1" />
              <div>
                <span className="font-semibold block">Email</span>
                <a href="mailto:vastrabymonty@gmail.com" className="text-[#686764] hover:text-[#c4622d]">
                  vastrabymonty@gmail.com
                </a>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm text-[#2c2c2c]">
              <MapPin className="w-4 h-4 text-[#c4622d] shrink-0 mt-1" />
              <div>
                <span className="font-semibold block">Store Location</span>
                <span className="text-[#686764] leading-relaxed">
                  MONTS, Shop No.7 The Emporium, Puri Anand Vilas, Haryana, Faridabad, 121007
                </span>
              </div>
            </div>
          </div>

          {/* Form Column */}
          <div className="md:col-span-2 p-8 bg-white rounded-[6px] border border-[#e8e4df] relative overflow-hidden">
            <FormOverlayLoader
              isLoading={isSubmitting}
              message="Sending your inquiry to our concierge team..."
            />
            {isSuccess ? (
              <div className="flex flex-col items-center justify-center text-center py-12 gap-4">
                <CheckCircle2 className="w-12 h-12 text-[#8b7355]" />
                <h3 className="text-xl font-bold text-[#060505]" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Message Received
                </h3>
                <p className="text-sm text-[#686764] max-w-md" style={{ fontFamily: "'Cormorant', serif", fontSize: '1.15rem' }}>
                  Thank you for reaching out, <span className="font-semibold text-[#060505]">{submittedPayload?.fullName || formData.fullName}</span>. Our concierge team has received your message and will reach back at <span className="font-semibold text-[#060505]">{submittedPayload?.email || formData.email}</span> within 24 hours.
                </p>
                <Button variant="outline" onClick={handleReset} className="mt-4">
                  Send Another Message
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
                {fetcher.data?.error && (
                  <div className="p-3.5 bg-red-50 border border-red-200 rounded-[6px] flex items-center gap-2.5 text-xs text-red-700">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{fetcher.data.error}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    name="fullName"
                    required
                    placeholder="e.g. Aditi Sharma"
                    value={formData.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.fullName ? errors.fullName : undefined}
                    disabled={isSubmitting}
                  />
                  <Input
                    label="Email Address"
                    name="email"
                    type="email"
                    required
                    placeholder="name@domain.com"
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.email ? errors.email : undefined}
                    disabled={isSubmitting}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Contact Number"
                    name="phone"
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.phone ? errors.phone : undefined}
                    disabled={isSubmitting}
                  />
                  <Input
                    label="Subject"
                    name="subject"
                    required
                    placeholder="Order inquiry / custom sizing"
                    value={formData.subject}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.subject ? errors.subject : undefined}
                    helperText={
                      !errors.subject
                        ? `${subjectWordCount} / ${MAX_SUBJECT_WORDS} words`
                        : undefined
                    }
                    disabled={isSubmitting}
                  />
                </div>

                <div className="flex flex-col gap-1.5" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                  <label htmlFor="contact-message" className="text-xs font-semibold text-[#060505] tracking-wide flex items-center gap-1">
                    <span>Your Message</span>
                    <span className="text-[#dc2626] font-semibold" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={4}
                    value={formData.message}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isSubmitting}
                    placeholder="How can we help you today?"
                    className={clsx(
                      'w-full text-sm rounded-[6px] border p-3 outline-none bg-[#faf8f5] text-[#2c2c2c] placeholder:text-[#afaba6] transition-colors',
                      touched.message && errors.message
                        ? 'border-[#dc2626] focus:border-[#dc2626] focus:ring-1 focus:ring-[#dc2626]'
                        : 'border-[#e8e4df] focus:border-[#c4622d] focus:ring-1 focus:ring-[#c4622d]',
                    )}
                  />
                  {touched.message && errors.message && (
                    <p className="text-xs text-[#dc2626]">{errors.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  className="self-start px-8"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                >
                  {isSubmitting ? 'Sending Message...' : 'Send Message'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

