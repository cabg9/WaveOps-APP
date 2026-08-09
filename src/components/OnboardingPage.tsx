import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useFirestoreAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db, storage } from '@/firebase-config';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Phone, MapPin, Droplets, Award, Calendar, User, Globe, CreditCard, AlertTriangle, Pill, Camera, ChevronRight, ChevronLeft, Check } from 'lucide-react';

const COUNTRY_CODES = [
  { code: "+593", flag: "EC", name: "Ecuador" },
  { code: "+1", flag: "US", name: "Estados Unidos" },
  { code: "+44", flag: "GB", name: "Reino Unido" },
  { code: "+34", flag: "ES", name: "Espana" },
  { code: "+49", flag: "DE", name: "Alemania" },
  { code: "+33", flag: "FR", name: "Francia" },
  { code: "+39", flag: "IT", name: "Italia" },
  { code: "+31", flag: "NL", name: "Paises Bajos" },
  { code: "+41", flag: "CH", name: "Suiza" },
  { code: "+43", flag: "AT", name: "Austria" },
  { code: "+32", flag: "BE", name: "Belgica" },
  { code: "+46", flag: "SE", name: "Suecia" },
  { code: "+47", flag: "NO", name: "Noruega" },
  { code: "+45", flag: "DK", name: "Dinamarca" },
  { code: "+358", flag: "FI", name: "Finlandia" },
  { code: "+48", flag: "PL", name: "Polonia" },
  { code: "+420", flag: "CZ", name: "Republica Checa" },
  { code: "+36", flag: "HU", name: "Hungria" },
  { code: "+351", flag: "PT", name: "Portugal" },
  { code: "+30", flag: "GR", name: "Grecia" },
  { code: "+353", flag: "IE", name: "Irlanda" },
  { code: "+40", flag: "RO", name: "Rumania" },
  { code: "+7", flag: "RU", name: "Rusia" },
  { code: "+90", flag: "TR", name: "Turquia" },
  { code: "+972", flag: "IL", name: "Israel" },
  { code: "+971", flag: "AE", name: "Emiratos Arabes" },
  { code: "+966", flag: "SA", name: "Arabia Saudita" },
  { code: "+91", flag: "IN", name: "India" },
  { code: "+86", flag: "CN", name: "China" },
  { code: "+81", flag: "JP", name: "Japon" },
  { code: "+82", flag: "KR", name: "Corea del Sur" },
  { code: "+84", flag: "VN", name: "Vietnam" },
  { code: "+62", flag: "ID", name: "Indonesia" },
  { code: "+63", flag: "PH", name: "Filipinas" },
  { code: "+65", flag: "SG", name: "Singapur" },
  { code: "+60", flag: "MY", name: "Malasia" },
  { code: "+66", flag: "TH", name: "Tailandia" },
  { code: "+61", flag: "AU", name: "Australia" },
  { code: "+64", flag: "NZ", name: "Nueva Zelanda" },
  { code: "+52", flag: "MX", name: "Mexico" },
  { code: "+55", flag: "BR", name: "Brasil" },
  { code: "+54", flag: "AR", name: "Argentina" },
  { code: "+56", flag: "CL", name: "Chile" },
  { code: "+51", flag: "PE", name: "Peru" },
  { code: "+57", flag: "CO", name: "Colombia" },
  { code: "+58", flag: "VE", name: "Venezuela" },
  { code: "+598", flag: "UY", name: "Uruguay" },
  { code: "+591", flag: "BO", name: "Bolivia" },
  { code: "+502", flag: "GT", name: "Guatemala" },
  { code: "+503", flag: "SV", name: "El Salvador" },
  { code: "+505", flag: "NI", name: "Nicaragua" },
  { code: "+506", flag: "CR", name: "Costa Rica" },
  { code: "+507", flag: "PA", name: "Panama" },
  { code: "+53", flag: "CU", name: "Cuba" },
  { code: "+509", flag: "HT", name: "Haiti" },
  { code: "+1-809", flag: "DO", name: "Republica Dominicana" },
  { code: "+504", flag: "HN", name: "Honduras" },
  { code: "+27", flag: "ZA", name: "Sudafrica" },
  { code: "+20", flag: "EG", name: "Egipto" },
  { code: "+212", flag: "MA", name: "Marruecos" },
  { code: "+234", flag: "NG", name: "Nigeria" },
  { code: "+254", flag: "KE", name: "Kenia" },
  { code: "+255", flag: "TZ", name: "Tanzania" },
  { code: "+256", flag: "UG", name: "Uganda" },
  { code: "+260", flag: "ZM", name: "Zambia" },
  { code: "+263", flag: "ZW", name: "Zimbabue" },
  { code: "+265", flag: "MW", name: "Malawi" },
  { code: "+250", flag: "RW", name: "Ruanda" },
  { code: "+257", flag: "BI", name: "Burundi" },
  { code: "+268", flag: "SZ", name: "Suazilandia" },
  { code: "+266", flag: "LS", name: "Lesoto" },
  { code: "+267", flag: "BW", name: "Botsuana" },
  { code: "+264", flag: "NA", name: "Namibia" },
  { code: "+261", flag: "MG", name: "Madagascar" },
  { code: "+243", flag: "CD", name: "Congo (DRC)" },
  { code: "+242", flag: "CG", name: "Congo" },
  { code: "+241", flag: "GA", name: "Gabon" },
  { code: "+240", flag: "GQ", name: "Guinea Ecuatorial" },
  { code: "+237", flag: "CM", name: "Camerun" },
  { code: "+236", flag: "CF", name: "Republica Centroafricana" },
  { code: "+235", flag: "TD", name: "Chad" },
  { code: "+226", flag: "BF", name: "Burkina Faso" },
  { code: "+233", flag: "GH", name: "Ghana" },
  { code: "+231", flag: "LR", name: "Liberia" },
  { code: "+232", flag: "SL", name: "Sierra Leona" },
  { code: "+229", flag: "BJ", name: "Benin" },
  { code: "+228", flag: "TG", name: "Togo" },
  { code: "+225", flag: "CI", name: "Costa de Marfil" },
  { code: "+224", flag: "GN", name: "Guinea" },
  { code: "+223", flag: "ML", name: "Mali" },
  { code: "+222", flag: "MR", name: "Mauritania" },
  { code: "+221", flag: "SN", name: "Senegal" },
  { code: "+220", flag: "GM", name: "Gambia" },
  { code: "+218", flag: "LY", name: "Libia" },
  { code: "+216", flag: "TN", name: "Tunez" },
  { code: "+213", flag: "DZ", name: "Argelia" },
  { code: "+211", flag: "SS", name: "Sudan del Sur" },
  { code: "+249", flag: "SD", name: "Sudan" },
  { code: "+251", flag: "ET", name: "Etiopia" },
  { code: "+253", flag: "DJ", name: "Yibuti" },
  { code: "+252", flag: "SO", name: "Somalia" },
  { code: "+258", flag: "MZ", name: "Mozambique" },
  { code: "+92", flag: "PK", name: "Pakistan" },
  { code: "+880", flag: "BD", name: "Banglades" },
  { code: "+94", flag: "LK", name: "Sri Lanka" },
  { code: "+95", flag: "MM", name: "Myanmar" },
  { code: "+98", flag: "IR", name: "Iran" },
  { code: "+964", flag: "IQ", name: "Irak" },
  { code: "+962", flag: "JO", name: "Jordania" },
  { code: "+963", flag: "SY", name: "Siria" },
  { code: "+961", flag: "LB", name: "Libano" },
  { code: "+965", flag: "KW", name: "Kuwait" },
  { code: "+974", flag: "QA", name: "Qatar" },
  { code: "+973", flag: "BH", name: "Barein" },
  { code: "+968", flag: "OM", name: "Oman" },
  { code: "+967", flag: "YE", name: "Yemen" },
  { code: "+93", flag: "AF", name: "Afganistan" },
  { code: "+376", flag: "AD", name: "Andorra" },
  { code: "+374", flag: "AM", name: "Armenia" },
  { code: "+994", flag: "AZ", name: "Azerbaiyan" },
  { code: "+375", flag: "BY", name: "Bielorrusia" },
  { code: "+387", flag: "BA", name: "Bosnia y Herzegovina" },
  { code: "+359", flag: "BG", name: "Bulgaria" },
  { code: "+385", flag: "HR", name: "Croacia" },
  { code: "+357", flag: "CY", name: "Chipre" },
  { code: "+372", flag: "EE", name: "Estonia" },
  { code: "+298", flag: "FO", name: "Islas Feroe" },
  { code: "+995", flag: "GE", name: "Georgia" },
  { code: "+350", flag: "GI", name: "Gibraltar" },
  { code: "+354", flag: "IS", name: "Islandia" },
  { code: "+378", flag: "SM", name: "San Marino" },
  { code: "+373", flag: "MD", name: "Moldavia" },
  { code: "+377", flag: "MC", name: "Monaco" },
  { code: "+382", flag: "ME", name: "Montenegro" },
  { code: "+389", flag: "MK", name: "Macedonia del Norte" },
  { code: "+381", flag: "RS", name: "Serbia" },
  { code: "+421", flag: "SK", name: "Eslovaquia" },
  { code: "+386", flag: "SI", name: "Eslovenia" },
  { code: "+380", flag: "UA", name: "Ucrania" },
  { code: "+76", flag: "KZ", name: "Kazajistan" },
  { code: "+998", flag: "UZ", name: "Uzbekistan" },
  { code: "+992", flag: "TJ", name: "Tayikistan" },
  { code: "+993", flag: "TM", name: "Turkmenistan" },
  { code: "+996", flag: "KG", name: "Kirguistan" },
  { code: "+976", flag: "MN", name: "Mongolia" },
  { code: "+852", flag: "HK", name: "Hong Kong" },
  { code: "+853", flag: "MO", name: "Macao" },
  { code: "+886", flag: "TW", name: "Taiwan" },
  { code: "+850", flag: "KP", name: "Corea del Norte" },
  { code: "+856", flag: "LA", name: "Laos" },
  { code: "+855", flag: "KH", name: "Camboya" },
  { code: "+670", flag: "TL", name: "Timor Oriental" },
  { code: "+673", flag: "BN", name: "Brunei" },
  { code: "+679", flag: "FJ", name: "Fiyi" },
  { code: "+677", flag: "SB", name: "Islas Salomon" },
  { code: "+678", flag: "VU", name: "Vanuatu" },
  { code: "+685", flag: "WS", name: "Samoa" },
  { code: "+682", flag: "CK", name: "Islas Cook" },
  { code: "+681", flag: "WF", name: "Wallis y Futuna" },
  { code: "+689", flag: "PF", name: "Polinesia Francesa" },
  { code: "+687", flag: "NC", name: "Nueva Caledonia" },
  { code: "+692", flag: "MH", name: "Islas Marshall" },
  { code: "+691", flag: "FM", name: "Micronesia" },
  { code: "+680", flag: "PW", name: "Palau" },
  { code: "+674", flag: "NR", name: "Nauru" },
  { code: "+672", flag: "NF", name: "Isla Norfolk" },
  { code: "+690", flag: "TK", name: "Tokelau" },
  { code: "+678", flag: "TV", name: "Tuvalu" },
  { code: "+683", flag: "NU", name: "Niue" },
  { code: "+686", flag: "KI", name: "Kiribati" },
  { code: "+675", flag: "PG", name: "Papua Nueva Guinea" },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    displayName: '',
    phoneCountry: '+593',
    phone: '',
    nationality: '',
    cedula: '',
    passport: '',
    birthDate: '',
    address: '',
    bloodType: '',
    allergies: '',
    medications: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    certificationNumber: '',
    certificationExpiry: '',
    apneaCert: '',
    bankCountry: '',
    bankName: '',
    accountType: '',
    accountNumber: '',
    routingNumber: '',
  });

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user?.profileComplete) { navigate('/'); }
  }, [user, navigate]);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const handlePhotoClick = () => fileInputRef.current?.click();

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Solo se permiten imagenes'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('La imagen debe ser menor a 5MB'); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const uploadPhoto = async (userId: string): Promise<string | null> => {
    if (!photoFile) return null;
    const storageRef = ref(storage, `users/${userId}/profile-photo.jpg`);
    await uploadBytes(storageRef, photoFile);
    return getDownloadURL(storageRef);
  };

  const validateStep = (stepNum: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (stepNum === 1) {
      if (!form.displayName.trim()) newErrors.displayName = 'Nombre para mostrar es obligatorio';
      if (!form.phone.trim()) newErrors.phone = 'Telefono es obligatorio';
      if (!form.nationality.trim()) newErrors.nationality = 'Nacionalidad es obligatoria';
      if (!form.birthDate.trim()) newErrors.birthDate = 'Fecha de nacimiento es obligatoria';
      if (!form.cedula.trim() && !form.passport.trim()) newErrors.cedula = 'Cedula o pasaporte es obligatorio';
      if (!form.address.trim()) newErrors.address = 'Direccion es obligatoria';
      if (!photoFile && !photoPreview) newErrors.photo = 'Foto de perfil es obligatoria';
    } else if (stepNum === 2) {
      if (!form.emergencyContactName.trim()) newErrors.emergencyContactName = 'Nombre de contacto de emergencia es obligatorio';
      if (!form.emergencyContactPhone.trim()) newErrors.emergencyContactPhone = 'Telefono de emergencia es obligatorio';
      if (!form.emergencyContactRelation.trim()) newErrors.emergencyContactRelation = 'Relacion es obligatoria';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const goToStep = (target: number) => {
    if (target > step) {
      if (!validateStep(step)) return;
    }
    setStep(target);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!validateStep(3)) return;
    setLoading(true);
    try {
      const userId = user.id;
      let photoURL: string | null = null;
      try {
        photoURL = await uploadPhoto(userId);
      } catch (e) { console.error('Error subiendo foto:', e); }
      await updateDoc(doc(db, 'users', userId), {
        displayName: form.displayName || user.name,
        phone: form.phoneCountry + ' ' + form.phone,
        nationality: form.nationality,
        cedula: form.cedula,
        passport: form.passport,
        birthDate: form.birthDate,
        address: form.address,
        bloodType: form.bloodType,
        allergies: form.allergies,
        medications: form.medications,
        emergencyContactName: form.emergencyContactName,
        emergencyContactPhone: form.emergencyContactPhone,
        emergencyContactRelation: form.emergencyContactRelation,
        certificationNumber: form.certificationNumber,
        certificationExpiry: form.certificationExpiry,
        apneaCert: form.apneaCert,
        bankCountry: form.bankCountry,
        bankName: form.bankName,
        accountType: form.accountType,
        accountNumber: form.accountNumber,
        routingNumber: form.routingNumber,
        photoURL: photoURL || '',
        profileComplete: true,
        updatedAt: new Date().toISOString(),
      });
      navigate('/');
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally { setLoading(false); }
  };

  if (!user) return null;

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <div key={s} className={`flex items-center gap-1 ${s < 3 ? 'flex-1' : ''}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step === s ? 'bg-corporate text-white' : step > s ? 'bg-green-500 text-white' : 'bg-[#E5E5E7] text-[#86868B]'
          }`}>
            {step > s ? <Check className="w-4 h-4" /> : s}
          </div>
          {s < 3 && <div className={`h-1 flex-1 rounded-full ${step > s ? 'bg-green-500' : 'bg-[#E5E5E7]'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-[0_2px_8px_rgba(0,0,0,0.04)] max-w-2xl w-full">
        <div className="text-center mb-6">
          <img src="/logo-waveops.png" alt="WaveOps" className="w-48 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-[#1D1D1F]">Completa tu perfil</h1>
          <p className="text-sm text-[#86868B] mt-1">Paso {step} de 3</p>
          <StepIndicator />
        </div>

        {step === 1 && (
          <div className="space-y-5">
            <div className="flex flex-col items-center gap-3">
              <div 
                onClick={handlePhotoClick}
                className="w-28 h-28 rounded-full bg-[#F5F5F7] border-2 border-dashed border-[#D1D1D6] flex items-center justify-center cursor-pointer hover:border-corporate transition-colors overflow-hidden"
              >
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-[#86868B]" />
                )}
              </div>
              <p className="text-sm text-[#86868B]">{photoPreview ? 'Foto seleccionada' : 'Haz clic para subir foto de perfil *'}</p>
              {errors.photo && <p className="text-sm text-red-500">{errors.photo}</p>}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><User className="w-4 h-4 text-corporate" /> Nombre para mostrar *</label>
              <Input value={form.displayName} onChange={e => handleChange('displayName', e.target.value)} placeholder="Como quieres que te llamen" className={errors.displayName ? 'border-red-500' : ''} />
              {errors.displayName && <p className="text-sm text-red-500">{errors.displayName}</p>}
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Phone className="w-4 h-4 text-corporate" /> Telefono *</label>
              <div className="flex gap-2">
                <select value={form.phoneCountry} onChange={e => handleChange('phoneCountry', e.target.value)} className="w-36 h-10 rounded-xl border border-[#E5E5E7] px-2 text-sm">
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <Input className="flex-1" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="987654321" />
              </div>
              {errors.phone && <p className="text-sm text-red-500">{errors.phone}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Globe className="w-4 h-4 text-corporate" /> Nacionalidad *</label>
                <Input value={form.nationality} onChange={e => handleChange('nationality', e.target.value)} placeholder="Ecuatoriana" className={errors.nationality ? 'border-red-500' : ''} />
                {errors.nationality && <p className="text-sm text-red-500">{errors.nationality}</p>}
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Calendar className="w-4 h-4 text-corporate" /> Fecha de nacimiento *</label>
                <Input type="date" value={form.birthDate} onChange={e => handleChange('birthDate', e.target.value)} className={errors.birthDate ? 'border-red-500' : ''} />
                {errors.birthDate && <p className="text-sm text-red-500">{errors.birthDate}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]">Cedula / ID</label>
                <Input value={form.cedula} onChange={e => handleChange('cedula', e.target.value)} placeholder="1712345678" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]">Pasaporte</label>
                <Input value={form.passport} onChange={e => handleChange('passport', e.target.value)} placeholder="PA123456" />
              </div>
            </div>
            {errors.cedula && <p className="text-sm text-red-500">{errors.cedula}</p>}

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><MapPin className="w-4 h-4 text-corporate" /> Direccion de residencia *</label>
              <Input value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="Av. Charles Darwin, Puerto Ayora" className={errors.address ? 'border-red-500' : ''} />
              {errors.address && <p className="text-sm text-red-500">{errors.address}</p>}
            </div>

            <Button onClick={() => goToStep(2)} className="w-full bg-corporate h-12">
              Continuar <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Droplets className="w-4 h-4 text-corporate" /> Tipo de sangre</label>
              <select value={form.bloodType} onChange={e => handleChange('bloodType', e.target.value)} className="w-full h-10 rounded-xl border border-[#E5E5E7] px-3 text-sm">
                <option value="">Seleccionar</option>
                <option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option>
                <option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><AlertTriangle className="w-4 h-4 text-corporate" /> Alergias</label>
              <Input value={form.allergies} onChange={e => handleChange('allergies', e.target.value)} placeholder="Ninguna" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Pill className="w-4 h-4 text-corporate" /> Medicamentos</label>
              <Input value={form.medications} onChange={e => handleChange('medications', e.target.value)} placeholder="Ninguno" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><User className="w-4 h-4 text-corporate" /> Contacto de emergencia (nombre) *</label>
              <Input value={form.emergencyContactName} onChange={e => handleChange('emergencyContactName', e.target.value)} placeholder="Nombre completo" className={errors.emergencyContactName ? 'border-red-500' : ''} />
              {errors.emergencyContactName && <p className="text-sm text-red-500">{errors.emergencyContactName}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Phone className="w-4 h-4 text-corporate" /> Tel. emergencia *</label>
                <Input value={form.emergencyContactPhone} onChange={e => handleChange('emergencyContactPhone', e.target.value)} placeholder="+593 98 765 4321" className={errors.emergencyContactPhone ? 'border-red-500' : ''} />
                {errors.emergencyContactPhone && <p className="text-sm text-red-500">{errors.emergencyContactPhone}</p>}
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]">Relacion *</label>
                <select value={form.emergencyContactRelation} onChange={e => handleChange('emergencyContactRelation', e.target.value)} className="w-full h-10 rounded-xl border border-[#E5E5E7] px-3 text-sm">
                  <option value="">Seleccionar</option>
                  <option value="Esposo/a">Esposo/a</option>
                  <option value="Padre">Padre</option>
                  <option value="Madre">Madre</option>
                  <option value="Hijo/a">Hijo/a</option>
                  <option value="Hermano/a">Hermano/a</option>
                  <option value="Tio/a">Tio/a</option>
                  <option value="Primo/a">Primo/a</option>
                  <option value="Amigo/a">Amigo/a</option>
                  <option value="Otro">Otro</option>
                </select>
                {errors.emergencyContactRelation && <p className="text-sm text-red-500">{errors.emergencyContactRelation}</p>}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12"><ChevronLeft className="w-4 h-4 mr-1" /> Atras</Button>
              <Button onClick={() => goToStep(3)} className="flex-1 bg-corporate h-12">Continuar <ChevronRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Award className="w-4 h-4 text-corporate" /> Certificacion de buceo (opcional)</label>
              <Input value={form.certificationNumber} onChange={e => handleChange('certificationNumber', e.target.value)} placeholder="PADI #123456" />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]"><Calendar className="w-4 h-4 text-corporate" /> Vencimiento certificacion</label>
              <Input type="date" value={form.certificationExpiry} onChange={e => handleChange('certificationExpiry', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[#1D1D1F]">Certificacion de apnea (opcional)</label>
              <Input value={form.apneaCert} onChange={e => handleChange('apneaCert', e.target.value)} placeholder="AIDA #123456" />
            </div>
            <div className="border-t pt-4 mt-4">
              <p className="text-sm font-medium text-[#1D1D1F] mb-3 flex items-center gap-2"><CreditCard className="w-4 h-4 text-corporate" /> Datos bancarios</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-[#86868B]">Pais del banco</label>
                  <select value={form.bankCountry} onChange={e => handleChange('bankCountry', e.target.value)} className="w-full h-10 rounded-xl border border-[#E5E5E7] px-3 text-sm">
                    <option value="">Seleccionar</option>
                    <option value="EC">Ecuador</option>
                    <option value="US">USA</option>
                    <option value="PA">Panama</option>
                    <option value="CO">Colombia</option>
                    <option value="PE">Peru</option>
                    <option value="CL">Chile</option>
                    <option value="AR">Argentina</option>
                    <option value="BR">Brasil</option>
                    <option value="MX">Mexico</option>
                    <option value="ES">Espana</option>
                    <option value="GB">Reino Unido</option>
                    <option value="DE">Alemania</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#86868B]">Nombre del banco</label>
                  <Input value={form.bankName} onChange={e => handleChange('bankName', e.target.value)} placeholder="Banco Pichincha" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div className="space-y-2">
                  <label className="text-xs text-[#86868B]">Tipo de cuenta</label>
                  <select value={form.accountType} onChange={e => handleChange('accountType', e.target.value)} className="w-full h-10 rounded-xl border border-[#E5E5E7] px-3 text-sm">
                    <option value="">Seleccionar</option>
                    <option value="ahorros">Ahorros / Savings</option>
                    <option value="corriente">Corriente / Checking</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-[#86868B]">Numero de cuenta</label>
                  <Input value={form.accountNumber} onChange={e => handleChange('accountNumber', e.target.value)} placeholder="1234567890" />
                </div>
              </div>
              {form.bankCountry === 'US' && (
                <div className="space-y-2 mt-2">
                  <label className="text-xs text-[#86868B]">Routing Number (solo USA)</label>
                  <Input value={form.routingNumber} onChange={e => handleChange('routingNumber', e.target.value)} placeholder="021000021" />
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12"><ChevronLeft className="w-4 h-4 mr-1" /> Atras</Button>
              <Button onClick={handleSubmit} disabled={loading} className="flex-1 bg-corporate h-12">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Completar perfil'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
