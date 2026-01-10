import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Search, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

export default function ContactList({ users, currentUserEmail, onSelectUser }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredUsers = users
    .filter(u => u.email !== currentUserEmail)
    .filter(u => {
      const query = searchQuery.toLowerCase();
      return (
        u.full_name?.toLowerCase().includes(query) ||
        u.email?.toLowerCase().includes(query)
      );
    });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Sök efter namn eller email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl h-11"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-500 text-sm">
              {searchQuery ? 'Inga användare hittades' : 'Inga användare tillgängliga'}
            </p>
          </div>
        ) : (
          filteredUsers.map((user, index) => (
            <motion.button
              key={user.email}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelectUser(user)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-slate-50 transition-all border border-slate-100 hover:border-slate-200 hover:shadow-sm"
            >
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-lg flex-shrink-0">
                {user.full_name?.charAt(0) || user.email?.charAt(0)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {user.full_name || 'Ingen namn'}
                </p>
                <p className="text-sm text-slate-500 truncate">{user.email}</p>
              </div>
              <MessageCircle className="h-5 w-5 text-slate-400 flex-shrink-0" />
            </motion.button>
          ))
        )}
      </div>
    </div>
  );
}