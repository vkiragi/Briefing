import React, { useState } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBets } from '../context/BetContext';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';

export const Bankroll = () => {
  const { bankroll, transactions, addTransaction } = useBets();
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'deposit' | 'withdrawal'>('deposit');
  const [note, setNote] = useState('');
  
  // Calculator state
  const [unitSizePct, setUnitSizePct] = useState(1); // 1% default

  const handleTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    addTransaction({
      type,
      amount: Number(amount),
      note: note || (type === 'deposit' ? 'Deposit' : 'Withdrawal')
    });

    setAmount('');
    setNote('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="h-screen overflow-hidden flex flex-col px-2 md:px-4 py-4 md:py-8 max-w-[2400px] mx-auto"
    >
       <h1 className="text-3xl font-bold mb-6 flex-shrink-0">Bankroll Management</h1>

       <div className="flex-1 overflow-y-auto">
         <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Main Bankroll Display & Actions */}
         <div className="lg:col-span-2 space-y-6">
            <Card className="bg-gradient-to-r from-card to-card/50 border-accent/20 flex flex-col items-center justify-center py-10">
                <div className="text-gray-400 mb-2 font-medium">Current Balance</div>
                <div className="text-5xl font-bold text-white mb-6">${bankroll.toFixed(2)}</div>
                <div className="flex gap-4">
                    <button 
                        onClick={() => { setType('deposit'); document.getElementById('trans-form')?.focus(); }}
                        className="bg-accent text-background font-bold py-2 px-6 rounded-full hover:bg-accent/90 transition-colors flex items-center gap-2"
                    >
                        <ArrowUpRight size={18} /> Deposit
                    </button>
                    <button 
                        onClick={() => { setType('withdrawal'); document.getElementById('trans-form')?.focus(); }}
                        className="bg-white/10 text-white font-bold py-2 px-6 rounded-full hover:bg-white/20 transition-colors flex items-center gap-2"
                    >
                        <ArrowDownRight size={18} /> Withdraw
                    </button>
                </div>
            </Card>

            {/* Transaction Form */}
            <Card>
                <h3 className="text-lg font-bold mb-4">New Transaction</h3>
                <form onSubmit={handleTransaction} id="trans-form" className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="w-full md:w-auto">
                        <label className="text-xs text-gray-400 block mb-1 uppercase">Type</label>
                        <div className="flex bg-background rounded-lg p-1 border border-border">
                            <button 
                                type="button"
                                onClick={() => setType('deposit')}
                                className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1", type === 'deposit' ? "bg-accent text-background" : "text-gray-400 hover:text-white")}
                            >
                                Deposit
                            </button>
                            <button 
                                type="button"
                                onClick={() => setType('withdrawal')}
                                className={cn("px-4 py-2 rounded-md text-sm font-medium transition-colors flex-1", type === 'withdrawal' ? "bg-red-500 text-white" : "text-gray-400 hover:text-white")}
                            >
                                Withdraw
                            </button>
                        </div>
                    </div>
                    <div className="w-full md:flex-1">
                         <label className="text-xs text-gray-400 block mb-1 uppercase">Amount</label>
                         <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                            <input 
                                type="number" 
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg py-2 pl-7 pr-3 focus:outline-none focus:border-accent transition-colors"
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                                required
                            />
                         </div>
                    </div>
                    <div className="w-full md:flex-1">
                         <label className="text-xs text-gray-400 block mb-1 uppercase">Note (Optional)</label>
                         <input 
                            type="text" 
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            className="w-full bg-background border border-border rounded-lg py-2 px-3 focus:outline-none focus:border-accent transition-colors"
                            placeholder="e.g. Weekly deposit"
                        />
                    </div>
                    <button type="submit" className="w-full md:w-auto bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-6 rounded-lg transition-colors">
                        Submit
                    </button>
                </form>
            </Card>

            {/* Transaction History */}
            <Card>
                <h3 className="text-lg font-bold mb-4">Transaction History</h3>
                <div className="space-y-3">
                    {transactions.length === 0 ? (
                        <div className="text-center text-gray-500 py-4">No transactions yet.</div>
                    ) : (
                        transactions.slice(0, 10).map(tx => (
                            <div key={tx.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "p-2 rounded-full",
                                        tx.type === 'deposit' || tx.type === 'bet_won' || tx.type === 'bet_pushed' ? "bg-accent/10 text-accent" : "bg-red-500/10 text-red-500"
                                    )}>
                                        {tx.type === 'deposit' || tx.type === 'bet_won' ? <ArrowUpRight size={16} /> : 
                                         tx.type === 'bet_pushed' ? <div className="w-4 h-4 rounded-full border-2 border-accent" /> :
                                         <ArrowDownRight size={16} />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm capitalize">{tx.type.replace('_', ' ')}</div>
                                        <div className="text-xs text-gray-500">{new Date(tx.date).toLocaleDateString()} • {tx.note}</div>
                                    </div>
                                </div>
                                <div className={cn("font-bold", tx.amount > 0 ? "text-accent" : "text-white")}>
                                    {tx.type === 'withdrawal' || tx.type === 'bet_placed' ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </Card>
         </div>

         {/* Sidebar - Tools */}
         <div className="space-y-6">
            {/* Unit Calculator */}
            <Card className="bg-card border-l-4 border-l-accent">
                <div className="flex items-center gap-2 mb-4">
                    <Calculator size={20} className="text-accent" />
                    <h3 className="font-bold">Unit Calculator</h3>
                </div>
                <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Risk Percentage</span>
                            <span>{unitSizePct}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="5" 
                            step="0.5" 
                            value={unitSizePct}
                            onChange={(e) => setUnitSizePct(Number(e.target.value))}
                            className="w-full accent-accent h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                    <div className="p-4 bg-background rounded-lg border border-border text-center">
                        <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Recommended Unit Size</div>
                        <div className="text-2xl font-bold text-white">
                            ${((bankroll * unitSizePct) / 100).toFixed(2)}
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Standard conservative bankroll management suggests risking 1-2% of your total bankroll per bet (1 unit).
                    </p>
                </div>
            </Card>
         </div>
         </div>
       </div>
    </motion.div>
  );
};
