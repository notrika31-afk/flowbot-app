// app/dashboard/settings/page.tsx
'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Save, User, Globe, Lock, UploadCloud } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="w-full h-full p-8 overflow-y-auto bg-[#F3F4F6]" dir="rtl">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">הגדרות מערכת</h1>
          <p className="text-gray-500 text-lg">עדכון פרטי הבוט והעדפות חשבון.</p>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-2 bg-black text-white px-6 py-3 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg"
        >
          <Save className="w-5 h-5" />
          שמור שינויים
        </motion.button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Settings Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: General */}
          <Section title="כללי" icon={<User className="w-5 h-5"/>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InputGroup label="שם הבוט" placeholder="למשל: העוזר של FlowBot" defaultValue="FlowBot Assistant" />
              <InputGroup label="שם העסק" placeholder="שם החברה שלך" defaultValue="My Startup Ltd" />
            </div>
            <div className="mt-4">
               <InputGroup label="הודעת פתיחה (ברירת מחדל)" placeholder="שלום! איך אפשר לעזור?" type="textarea" />
            </div>
          </Section>

          {/* Section: Language & Region */}
          <Section title="שפה ואזור" icon={<Globe className="w-5 h-5"/>}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">שפת הבוט</label>
                  <select className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors">
                    <option>עברית (Hebrew)</option>
                    <option>English</option>
                    <option>Spanish</option>
                  </select>
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">אזור זמן</label>
                  <select className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors">
                    <option>Jerusalem (GMT+2)</option>
                    <option>New York (EST)</option>
                  </select>
               </div>
            </div>
          </Section>

        </div>

        {/* Sidebar Column: Profile & Security */}
        <div className="space-y-6">
          
          {/* Avatar Upload */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border-2 border-black flex flex-col items-center text-center"
          >
            <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center mb-4 cursor-pointer hover:border-black transition-colors">
               <UploadCloud className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900">לוגו הבוט</h3>
            <p className="text-xs text-gray-500 mt-1">מומלץ להעלות קובץ PNG שקוף<br/>בגודל 500x500 פיקסלים.</p>
          </motion.div>

          {/* Security */}
          <Section title="אבטחה ו-API" icon={<Lock className="w-5 h-5"/>}>
            <div className="space-y-4">
              <InputGroup label="API Key" value="sk_live_51M..." type="password" disabled={true} />
              <button className="text-sm text-red-500 font-bold hover:underline">אפס מפתח אבטחה</button>
            </div>
          </Section>

        </div>
      </div>
    </div>
  );
}

// UI Helpers
function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm"
    >
      <div className="flex items-center gap-2 mb-6 border-b border-gray-100 pb-4">
        <div className="p-2 bg-gray-100 rounded-lg text-gray-700">{icon}</div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </motion.div>
  )
}

function InputGroup({ label, placeholder, type = "text", defaultValue, value, disabled = false }: any) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      {type === 'textarea' ? (
        <textarea 
          rows={3}
          className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none transition-colors resize-none"
          placeholder={placeholder}
          defaultValue={defaultValue}
        />
      ) : (
        <input 
          type={type}
          disabled={disabled}
          className={`w-full p-3 bg-white border-2 rounded-xl focus:border-black focus:outline-none transition-colors ${disabled ? 'bg-gray-50 text-gray-400 border-gray-100' : 'border-gray-200'}`}
          placeholder={placeholder}
          defaultValue={defaultValue}
          value={value}
        />
      )}
    </div>
  )
}
