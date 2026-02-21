import React, { useState } from 'react';
import Button from "../../../components/ui/button/Button";
import InputField from "../../../components/form/input/InputField";
import Label from "../../../components/form/Label";
import { ReferenceProduit } from "../../../services/referenceService";

interface StepperModalContentProps {
    editingRef: ReferenceProduit | null;
    formData: any;
    setFormData: (data: any) => void;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
}

export default function StepperModalContent({
    editingRef,
    formData,
    setFormData,
    onClose,
    onSubmit
}: StepperModalContentProps) {
    const [currentStep, setCurrentStep] = useState(1);
    const steps = [
        { id: 1, title: 'Identification' },
        { id: 2, title: 'Détails Projet' },
        { id: 3, title: 'Classement & Divers' }
    ];

    const validateStep = (step: number) => {
        if (step === 1) {
            if (!formData.codeReference || !formData.designation) {
                alert("Veuillez remplir les champs obligatoires (Ref Interne, Désignation).");
                return false;
            }
        }
        if (step === 2) {
            if (!formData.indice?.trim()) {
                alert("Veuillez remplir le champ Indice.");
                return false;
            }
        }
        return true;
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            setCurrentStep(prev => Math.min(prev + 1, steps.length));
        }
    };

    const jumpToStep = (stepId: number) => {
        // Only allow jumping if we've passed validation for the current step (if moving forward)
        // Or always allow moving backward
        if (stepId < currentStep) {
            setCurrentStep(stepId);
        } else {
            // Check all steps up to the target
            for (let i = currentStep; i < stepId; i++) {
                if (!validateStep(i)) return;
            }
            setCurrentStep(stepId);
        }
    };

    const handleBack = () => {
        setCurrentStep(prev => Math.max(prev - 1, 1));
    };

    return (
        <div className="relative pt-8 pb-6 px-6 bg-gradient-to-br from-[#f8fafc] via-[#f1f5f9] to-[#e2e8f0] dark:from-gray-800 dark:via-gray-900 dark:to-gray-950 rounded-xl overflow-hidden shadow-2xl">

            {/* Ambient Background Blur Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/40 dark:bg-blue-600/10 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100/40 dark:bg-indigo-600/10 rounded-full blur-3xl -z-10 -translate-x-1/3 translate-y-1/3 pointer-events-none"></div>

            {/* Redesigned Stepper */}
            <div className="mb-10 relative z-10">
                <div className="flex items-center justify-center relative px-4">
                    {/* Background Line */}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full -z-20"></div>

                    {/* Active Progress Line */}
                    <div
                        className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-700 ease-in-out -z-10 shadow-[0_0_10px_rgba(37,99,235,0.3)]"
                        style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                    ></div>

                    <div className="flex justify-between w-full">
                        {steps.map((step) => {
                            const isActive = currentStep >= step.id;
                            const isCurrent = currentStep === step.id;
                            const isCompleted = currentStep > step.id;

                            return (
                                <div
                                    key={step.id}
                                    onClick={() => jumpToStep(step.id)}
                                    className={`flex flex-col items-center group cursor-pointer transition-all duration-300 relative ${isActive ? 'opacity-100' : 'opacity-50 hover:opacity-80'}`}
                                >
                                    <div
                                        className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-[3px] transition-all duration-500 z-10 
                                            ${isActive
                                                ? "bg-white dark:bg-gray-800 border-blue-600 dark:border-blue-500 text-blue-600 dark:text-blue-400 shadow-xl shadow-blue-500/20 scale-100"
                                                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400"
                                            }
                                            ${isCurrent ? "ring-4 ring-blue-50 dark:ring-blue-900/20 scale-110" : ""}
                                            ${isCompleted ? "bg-blue-600 border-blue-600 !text-white" : ""}
                                        `}
                                    >
                                        {isCompleted ? (
                                            <svg className="w-5 h-5 animate-[scaleIn_0.3s_ease-out]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                        ) : (
                                            <span className={`${isCurrent ? "animate-pulse" : ""}`}>{step.id}</span>
                                        )}

                                        {/* Current Step Glow Effect */}
                                        {isCurrent && (
                                            <span className="absolute inset-0 rounded-full bg-blue-400/30 animate-ping"></span>
                                        )}
                                    </div>
                                    <span className={`absolute top-14 text-xs font-bold tracking-wide transition-all duration-500 w-32 text-center ${isActive ? "text-blue-600 dark:text-blue-400 translate-y-0 opacity-100" : "text-gray-400 -translate-y-2 opacity-0 group-hover:opacity-100 group-hover:translate-y-0"}`}>
                                        {step.title}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <form onSubmit={(e) => e.preventDefault()} className="mt-12 min-h-[350px]">
                {/* Step 1: Identification & Base */}
                {currentStep === 1 && (
                    <div className="animate-[slideIn_0.4s_cubic-bezier(0.16,1,0.3,1)] space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="codeReference" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Ref Interne <span className="text-red-500">*</span></Label>
                                    <InputField
                                        id="codeReference"
                                        type="text"
                                        value={formData.codeReference}
                                        onChange={(e) => setFormData({ ...formData, codeReference: e.target.value })}
                                        required
                                        placeholder="Ex. 350647224"
                                        className="transition-all focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="referenceClient" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Réf client</Label>
                                    <InputField
                                        id="referenceClient"
                                        type="text"
                                        value={formData.referenceClient}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            const planif = val.length > 4 ? val.slice(4, 10) : "";
                                            setFormData({
                                                ...formData,
                                                referenceClient: val,
                                                planificateurDeCode: planif,
                                                referenceClientIndice: val + (formData.indice || "")
                                            });
                                        }}
                                        placeholder="Ex. L002525533NCP"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="designation" className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Désignation <span className="text-red-500">*</span></Label>
                                    <InputField
                                        id="designation"
                                        type="text"
                                        value={formData.designation}
                                        onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                                        required
                                        placeholder="Ex. CF CC21_L2_FSB_RH_SAB"
                                    />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <Label className="mb-2 block text-xs uppercase text-gray-500">Version</Label>
                                        <InputField type="text" value={formData.version} onChange={(e) => setFormData({ ...formData, version: e.target.value })} placeholder="L02" />
                                    </div>
                                    <div>
                                        <Label className="mb-2 block text-xs uppercase text-gray-500">Famille</Label>
                                        <InputField type="text" value={formData.familleProduit} onChange={(e) => setFormData({ ...formData, familleProduit: e.target.value })} placeholder="L2" />
                                    </div>
                                    <div>
                                        <Label className="mb-2 block text-xs uppercase text-gray-500">Projet</Label>
                                        <InputField type="text" value={formData.projet} onChange={(e) => setFormData({ ...formData, projet: e.target.value })} placeholder="CC21" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Détails Techniques */}
                {currentStep === 2 && (
                    <div className="animate-[slideIn_0.4s_cubic-bezier(0.16,1,0.3,1)] space-y-6">
                        <div className="bg-blue-50/30 dark:bg-blue-900/5 p-6 rounded-2xl border border-blue-100/50 dark:border-blue-800/20">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
                                <div>
                                    <Label className="mb-2 block text-sm font-medium">Planificateur</Label>
                                    <InputField type="text" value={formData.planificateurDeCode} onChange={(e) => setFormData({ ...formData, planificateurDeCode: e.target.value })} />
                                </div>
                                <div>
                                    <Label className="mb-2 block text-sm font-medium">Part Number</Label>
                                    <InputField type="text" value={formData.partNumber} onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })} />
                                </div>
                                <div>
                                    <Label className="mb-2 block text-sm font-medium">Compteur</Label>
                                    <div className="flex items-center h-10 px-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 font-mono text-sm tracking-widest text-gray-700 dark:text-gray-300 select-none">
                                        {formData.compteur != null && formData.compteur !== ''
                                            ? String(formData.compteur).padStart(7, '0')
                                            : <span className="text-gray-400 italic text-xs font-sans">Auto géré</span>
                                        }
                                    </div>
                                    <p className="mt-1 text-xs text-gray-400">Numéro unique — géré automatiquement</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                                <div>
                                    <Label className="mb-2 block text-sm font-medium">Indice <span className="text-red-500">*</span></Label>
                                    <InputField
                                        type="text"
                                        value={formData.indice}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setFormData({
                                                ...formData,
                                                indice: val,
                                                referenceClientIndice: (formData.referenceClient || "") + val
                                            });
                                        }}
                                        required
                                        placeholder="Ex. AE"
                                    />
                                </div>
                                <div>
                                    <Label className="mb-2 block text-sm font-medium">Réf Client + Indice</Label>
                                    <InputField type="text" value={formData.referenceClientIndice} onChange={(e) => setFormData({ ...formData, referenceClientIndice: e.target.value })} disabled className="bg-gray-100" />
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label className="mb-2 block text-xs uppercase text-gray-500">Orientation</Label>
                                    <InputField type="text" value={formData.orientation} onChange={(e) => setFormData({ ...formData, orientation: e.target.value })} />
                                </div>
                                <div>
                                    <Label className="mb-2 block text-xs uppercase text-gray-500">Temps</Label>
                                    <InputField type="text" value={formData.tempsDeGamme} onChange={(e) => setFormData({ ...formData, tempsDeGamme: e.target.value })} />
                                </div>
                                <div>
                                    <Label className="mb-2 block text-xs uppercase text-gray-500">Colisage</Label>
                                    <InputField type="number" value={formData.colisage} onChange={(e) => setFormData({ ...formData, colisage: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Classement & Divers */}
                {currentStep === 3 && (
                    <div className="animate-[slideIn_0.4s_cubic-bezier(0.16,1,0.3,1)] space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-5 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                    Détails Projet
                                </h4>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="mb-1.5 block text-xs">Code Projet</Label>
                                            <InputField type="text" value={formData.codeProjet} onChange={(e) => setFormData({ ...formData, codeProjet: e.target.value })} />
                                        </div>
                                        <div>
                                            <Label className="mb-1.5 block text-xs">Airbag Prog.</Label>
                                            <InputField type="text" value={formData.airbagProgramm} onChange={(e) => setFormData({ ...formData, airbagProgramm: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <Label className="mb-1.5 block text-xs">Description</Label>
                                        <InputField type="text" value={formData.descriptionProjet} onChange={(e) => setFormData({ ...formData, descriptionProjet: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                                    <Label className="mb-3 block font-semibold text-sm">Couleur d'impression</Label>
                                    <div className="flex gap-6">
                                        {['Noir', 'Bleu'].map((color) => (
                                            <label key={color} className="flex items-center gap-3 cursor-pointer group">
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${formData.couleurImpression === color ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                                                    {formData.couleurImpression === color && <div className="w-2 h-2 bg-white rounded-full" />}
                                                </div>
                                                <input
                                                    type="radio"
                                                    name="couleurImpression"
                                                    value={color}
                                                    checked={formData.couleurImpression === color}
                                                    onChange={(e) => setFormData({ ...formData, couleurImpression: e.target.value })}
                                                    className="hidden"
                                                />
                                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">{color}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-blue-50/30 dark:bg-blue-900/10">
                                    <Label className="mb-2 block text-xs font-semibold text-gray-500 uppercase">Unit & Legacy</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <select
                                            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600 outline-none"
                                            value={formData.uniteMesure}
                                            onChange={(e) => setFormData({ ...formData, uniteMesure: e.target.value })}
                                        >
                                            <option value="U">Unité (U)</option>
                                            <option value="KG">KG</option>
                                            <option value="M">Mètre</option>
                                        </select>
                                        <InputField type="text" value={formData.refInterneD2} onChange={(e) => setFormData({ ...formData, refInterneD2: e.target.value })} placeholder="Ref D2" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Floating Footer Actions */}
                <div className="flex justify-between items-center mt-10 pt-6 border-t border-gray-100 dark:border-gray-800">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={currentStep === 1 ? onClose : handleBack}
                        className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                    >
                        {currentStep === 1 ? "Annuler" : "Retour"}
                    </Button>

                    <div className="flex gap-3">
                        {currentStep < steps.length ? (
                            <Button
                                type="button"
                                onClick={handleNext}
                                className="px-8 bg-black hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200 text-white rounded-full shadow-xl shadow-black/10 dark:shadow-white/5 transition-all transform hover:scale-105"
                            >
                                Continuer
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                onClick={(e) => onSubmit(e as unknown as React.FormEvent)}
                                className="px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl shadow-blue-500/20 transition-all transform hover:scale-105"
                            >
                                {editingRef ? "Enregistrer" : "Confirmer"}
                            </Button>
                        )}
                    </div>
                </div>
            </form>

            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
