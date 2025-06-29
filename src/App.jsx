import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from "firebase/auth";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    onSnapshot,
    updateDoc,
    writeBatch
} from "firebase/firestore";

// --- PASSO 1: COLE AQUI A CONFIGURAÇÃO DO SEU FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCJh_COt-t55aHwcupvd5O6IAtWZLDkVzo",
  authDomain: "verdebet-86e5d.firebaseapp.com",
  projectId: "verdebet-86e5d",
  storageBucket: "verdebet-86e5d.firebasestorage.app",
  messagingSenderId: "1024525782610",
  appId: "1:1024525782610:web:8ea88b3342da5d0a12998b",
  measurementId: "G-QQHWPCH7W2"
};
// -------------------------------------------------------------

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const formatCurrency = (value) => {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// --- Dados de Jogos com Competições ---
const allMatchesData = [
    { id: 1, competition: "Brasileirão Série A", teamA: 'Flamengo', teamB: 'Palmeiras', odds: { '1': 2.20, 'X': 3.10, '2': 2.90 } },
    { id: 2, competition: "Brasileirão Série A", teamA: 'Corinthians', teamB: 'São Paulo', odds: { '1': 2.50, 'X': 3.00, '2': 2.60 } },
    { id: 3, competition: "Premier League", teamA: 'Man. City', teamB: 'Liverpool', odds: { '1': 1.80, 'X': 3.80, '2': 4.00 } },
    { id: 4, competition: "La Liga", teamA: 'Real Madrid', teamB: 'Barcelona', odds: { '1': 2.10, 'X': 3.50, '2': 3.20 } },
    { id: 5, competition: "Brasileirão Série A", teamA: 'Grêmio', teamB: 'Internacional', odds: { '1': 2.40, 'X': 3.20, '2': 2.75 } },
    { id: 6, competition: "Champions League", teamA: 'Bayern Munique', teamB: 'PSG', odds: { '1': 2.00, 'X': 3.60, '2': 3.50 } },
];

const competitions = [
    { id: 'all', name: 'Todos os Jogos' },
    { id: 'Brasileirão Série A', name: 'Brasileirão Série A' },
    { id: 'Premier League', name: 'Premier League' },
    { id: 'La Liga', name: 'La Liga' },
    { id: 'Champions League', name: 'Champions League' },
];

// --- Componentes ---
const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-8">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-green-500"></div>
    </div>
);

const AuthScreen = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await setDoc(doc(db, "users", userCredential.user.uid), {
                    email: userCredential.user.email,
                    balance: 1000.00
                });
            }
        } catch (err) {
            setError(err.message.includes('auth/invalid-credential') ? 'E-mail ou senha inválidos.' : 'Erro. Verifique os dados e tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-md">
                <h1 className="text-4xl font-bold tracking-tighter text-center mb-2">
                    <span className="text-green-500">VERDE</span><span className="text-white">BET</span>
                </h1>
                <p className="text-center text-gray-400 mb-6 italic">Dê o sinal verde para a sua sorte.</p>
                <h2 className="text-2xl font-bold text-center text-white mb-6">{isLogin ? 'Entrar na Conta' : 'Criar Conta'}</h2>
                <form onSubmit={handleAuth}>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-mail" className="w-full bg-gray-700 border-2 border-gray-600 rounded-md p-3 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading} />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" className="w-full bg-gray-700 border-2 border-gray-600 rounded-md p-3 mb-4 text-white focus:outline-none focus:ring-2 focus:ring-green-500" required disabled={isLoading} />
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-transform duration-200 hover:scale-105 flex justify-center items-center" disabled={isLoading}>
                        {isLoading ? <div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-white"></div> : (isLogin ? 'Entrar' : 'Cadastrar')}
                    </button>
                </form>
                <button onClick={() => setIsLogin(!isLogin)} className="w-full mt-4 text-sm text-center text-gray-400 hover:text-white" disabled={isLoading}>
                    {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Entre'}
                </button>
            </div>
        </div>
    );
};

const App = () => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [matches, setMatches] = useState([]);
    const [myBets, setMyBets] = useState([]);
    const [cashOutValues, setCashOutValues] = useState({});
    const [betSlip, setBetSlip] = useState([]);
    const [betType, setBetType] = useState('multiple');
    const [stakes, setStakes] = useState({});
    const [multipleStake, setMultipleStake] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isPlacingBet, setIsPlacingBet] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [currentView, setCurrentView] = useState('home'); // 'home', 'history', 'bank', 'account'
    const [selectedCompetition, setSelectedCompetition] = useState('all');
    const profileMenuRef = useRef(null);

    // Click away to close profile menu
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setIsProfileMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setIsLoading(true);
        const filtered = selectedCompetition === 'all'
            ? allMatchesData
            : allMatchesData.filter(m => m.competition === selectedCompetition);
        
        setTimeout(() => {
            setMatches(filtered);
            setIsLoading(false);
        }, 500);
    }, [selectedCompetition]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        if (!myBets.length) return;
        const interval = setInterval(() => {
            setCashOutValues(prev => {
                const newValues = {...prev};
                myBets.forEach(bet => {
                    if (bet.status === 'pending') {
                        const minValue = bet.stake * 0.5;
                        const maxValue = bet.winnings * 0.9;
                        const simulatedValue = Math.random() * (maxValue - minValue) + minValue;
                        newValues[bet.id] = simulatedValue;
                    }
                });
                return newValues;
            });
        }, 3000);
        return () => clearInterval(interval);
    }, [myBets]);

    useEffect(() => {
        if (!user) return;
        const userDocRef = doc(db, "users", user.uid);
        const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) setUserData(doc.data());
        });
        const betsColRef = collection(db, "users", user.uid, "bets");
        const q = query(betsColRef);
        const unsubscribeBets = onSnapshot(q, (snapshot) => {
            const betsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMyBets(betsData.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis()));
        });
        return () => {
            unsubscribeUser();
            unsubscribeBets();
        };
    }, [user]);

    const handleLogout = async () => await signOut(auth);
    
    const handleOddClick = (match, pick, odds) => {
        const pickName = (p) => p === '1' ? match.teamA : (p === 'X' ? 'Empate' : match.teamB);
        const newSelection = {
            matchId: match.id,
            match: `${match.teamA} vs ${match.teamB}`,
            pick: pickName(pick),
            pickCode: pick,
            odds
        };
        setBetSlip(prev => {
            const isTogglingOff = prev.some(item => item.matchId === match.id && item.pickCode === pick);
            if (isTogglingOff) return prev.filter(item => item.matchId !== match.id);
            const slipWithoutThisMatch = prev.filter(item => item.matchId !== match.id);
            return [...slipWithoutThisMatch, newSelection];
        });
    };
    
    const handlePlaceBet = async () => {
        setIsPlacingBet(true);
        if (betType === 'multiple') {
            await placeMultipleBet();
        } else {
            await placeSimpleBets();
        }
        setIsPlacingBet(false);
    };

    const placeMultipleBet = async () => {
        const stakeValue = parseFloat(multipleStake);
        if (betSlip.length < 2) {
            alert("Para uma aposta múltipla, precisa de selecionar pelo menos 2 jogos.");
            return;
        }
        if (!stakeValue || stakeValue <= 0) {
            alert("Por favor, insira um valor de aposta válido.");
            return;
        }
        if (!userData || stakeValue > userData.balance) {
            alert("Saldo insuficiente.");
            return;
        }
        try {
            const totalOdd = betSlip.reduce((acc, item) => acc * item.odds, 1);
            const potentialWinnings = stakeValue * totalOdd;
            const newBalance = userData.balance - stakeValue;
            
            const userDocRef = doc(db, "users", user.uid);
            const betsColRef = collection(db, "users", user.uid, "bets");
            
            const batch = writeBatch(db);
            batch.update(userDocRef, { balance: newBalance });
            batch.set(doc(betsColRef), {
                type: 'multiple',
                selections: betSlip,
                stake: stakeValue,
                totalOdd: totalOdd,
                status: 'pending',
                winnings: potentialWinnings,
                createdAt: new Date()
            });
            await batch.commit();
            
            setBetSlip([]);
            setMultipleStake('');
            alert("Aposta múltipla realizada com sucesso!");
        } catch (error) {
            console.error("Erro ao realizar aposta múltipla: ", error);
            alert("Ocorreu um erro ao realizar a aposta.");
        }
    };

    const placeSimpleBets = async () => {
        const validStakes = Object.entries(stakes).filter(([_, value]) => parseFloat(value) > 0);
        if (validStakes.length === 0) {
            alert("Por favor, insira um valor de aposta válido para pelo menos uma seleção.");
            return;
        }
        
        const totalStake = validStakes.reduce((acc, [_, value]) => acc + parseFloat(value), 0);
        if (!userData || totalStake > userData.balance) {
            alert("Saldo insuficiente para as apostas.");
            return;
        }

        try {
            const newBalance = userData.balance - totalStake;
            const userDocRef = doc(db, "users", user.uid);
            const betsColRef = collection(db, "users", user.uid, "bets");
            const batch = writeBatch(db);

            batch.update(userDocRef, { balance: newBalance });

            validStakes.forEach(([matchId, stakeValue]) => {
                const selection = betSlip.find(sel => sel.matchId.toString() === matchId);
                if (selection) {
                    batch.set(doc(betsColRef), {
                        type: 'simple',
                        selection,
                        stake: parseFloat(stakeValue),
                        status: 'pending',
                        winnings: parseFloat(stakeValue) * selection.odds,
                        createdAt: new Date()
                    });
                }
            });

            await batch.commit();

            setBetSlip([]);
            setStakes({});
            alert(`${validStakes.length} aposta(s) simples realizada(s) com sucesso!`);
        } catch (error) {
            console.error("Erro ao realizar apostas simples: ", error);
            alert("Ocorreu um erro ao realizar as apostas.");
        }
    };

    const handleCashOut = async (betId, cashOutValue) => {
        if (!userData || !cashOutValue || cashOutValue <= 0) {
            alert("Não é possível fazer o cash out neste momento.");
            return;
        }

        try {
            const newBalance = userData.balance + cashOutValue;
            const userDocRef = doc(db, "users", user.uid);
            const betDocRef = doc(db, "users", user.uid, "bets", betId);

            const batch = writeBatch(db);
            batch.update(userDocRef, { balance: newBalance });
            batch.update(betDocRef, {
                status: 'cashed_out',
                cashedOutAmount: cashOutValue
            });
            await batch.commit();
            
            alert(`Cash out de ${formatCurrency(cashOutValue)} realizado com sucesso!`);
        } catch (error) {
            console.error("Erro ao fazer cash out: ", error);
            alert("Ocorreu um erro ao processar o seu cash out.");
        }
    };
    
    const handleDeposit = async () => {
        const amountString = prompt("Qual valor você gostaria de depositar?", "50");
        if (!amountString) return;

        const amount = parseFloat(amountString);
        if (isNaN(amount) || amount <= 0) {
            alert("Por favor, insira um valor válido.");
            return;
        }
        
        try {
            const userDocRef = doc(db, "users", user.uid);
            const newBalance = (userData?.balance || 0) + amount;
            await updateDoc(userDocRef, { balance: newBalance });
            alert(`Depósito de ${formatCurrency(amount)} realizado com sucesso!`);
        } catch(error) {
            console.error("Erro ao depositar:", error);
            alert("Ocorreu um erro ao processar o depósito.");
        }
    };

    const handleSettleBets = async () => {
        const pendingBets = myBets.filter(b => b.status === 'pending');
        if (pendingBets.length === 0) {
            alert("Nenhuma aposta pendente para simular.");
            return;
        }
        let totalWinningsFromAllBets = 0;
        const batch = writeBatch(db);
        
        for (const bet of pendingBets) {
            const betDocRef = doc(db, "users", user.uid, "bets", bet.id);
            let isBetWon = false;
            if (bet.type === 'multiple') {
                isBetWon = bet.selections.every(() => Math.random() < 0.4);
            } else { // simple
                isBetWon = Math.random() < 0.4;
            }

            if (isBetWon) {
                totalWinningsFromAllBets += bet.winnings;
                batch.update(betDocRef, { status: 'won' });
            } else {
                batch.update(betDocRef, { status: 'lost' });
            }
        }
        
        if (totalWinningsFromAllBets > 0) {
            const userDocRef = doc(db, "users", user.uid);
            const currentUserDoc = await getDoc(userDocRef);
            const currentBalance = currentUserDoc.data().balance;
            batch.update(userDocRef, { balance: currentBalance + totalWinningsFromAllBets });
        }
        
        await batch.commit();
        alert("Apostas simuladas!");
    };
    
    const handleStakesChange = (matchId, value) => setStakes(prev => ({...prev, [matchId]: value}));

    const totalOdd = betSlip.length > 0 ? betSlip.reduce((acc, item) => acc * item.odds, 1) : 0;
    const potentialWinnings = multipleStake * totalOdd;
    const selectedOddIds = betSlip.map(item => `${item.matchId}-${item.pickCode}`);

    const renderMainView = () => {
        switch (currentView) {
            case 'history':
                return <HistoryView bets={myBets} />;
            case 'bank':
                return <PlaceholderView title="Banco" message="Aqui você poderá gerir os seus depósitos e levantamentos." />;
            case 'account':
                return <PlaceholderView title="A Minha Conta" message="Aqui poderá editar os detalhes da sua conta." />;
            case 'home':
            default:
                return (
                    <div>
                        <h2 className="text-2xl font-semibold mb-4 text-green-400">{selectedCompetition === 'all' ? 'Todos os Jogos' : selectedCompetition}</h2>
                        {isLoading ? <LoadingSpinner /> : (
                            <div className="space-y-4">
                                {matches.map(match => (
                                    <div key={match.id} className="bg-gray-800 p-4 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-center">
                                        <div className="text-center md:text-left mb-4 md:mb-0">
                                            <span className="font-semibold text-lg text-white">{match.teamA}</span><span className="mx-2 text-gray-400">vs</span><span className="font-semibold text-lg text-white">{match.teamB}</span>
                                        </div>
                                        <div className="flex space-x-2">
                                            {[ '1', 'X', '2' ].map(pick => (
                                                <button key={pick} onClick={() => handleOddClick(match, pick, match.odds[pick])} className={`p-2 rounded w-24 font-semibold transition-all duration-200 ${selectedOddIds.includes(`${match.id}-${pick}`) ? 'bg-green-500 text-white scale-105' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                                    {pick} <br/> {match.odds[pick].toFixed(2)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
        }
    };
    
    if (isLoading && !user) return <LoadingSpinner />;
    if (!user) return <AuthScreen />;

    return (
        <div className="bg-gray-900 text-gray-200 font-sans p-4 md:p-8 min-h-screen">
            <div className="max-w-screen-xl mx-auto">
                <header className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                    <h1 className="text-4xl font-bold tracking-tighter cursor-pointer" onClick={() => setCurrentView('home')}><span className="text-green-500">VERDE</span><span className="text-white">BET</span></h1>
                    <div className="flex items-center space-x-4 relative">
                        <div className="text-right">
                             <p className="text-gray-400 text-sm">{userData?.email}</p>
                            <p id="user-balance" className="text-2xl font-bold text-green-400">{formatCurrency(userData?.balance)}</p>
                        </div>
                        
                        <div ref={profileMenuRef}>
                            <button onClick={() => setIsProfileMenuOpen(prev => !prev)} className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            </button>
                            {isProfileMenuOpen && (
                                <div className="absolute top-14 right-0 w-80 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-10">
                                    <div className="p-4 border-b border-gray-700">
                                        <p className="font-bold text-white">{userData?.email}</p>
                                        <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(userData?.balance)}</p>
                                        <button onClick={handleDeposit} className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Depositar</button>
                                    </div>
                                    <div className="p-4 grid grid-cols-3 gap-4 text-center">
                                        <div onClick={() => { setCurrentView('bank'); setIsProfileMenuOpen(false); }} className="flex flex-col items-center space-y-1 text-gray-300 hover:text-green-400 cursor-pointer"><div className="p-3 bg-gray-700 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg></div><span className="text-xs">Banco</span></div>
                                        <div onClick={() => { setCurrentView('account'); setIsProfileMenuOpen(false); }} className="flex flex-col items-center space-y-1 text-gray-300 hover:text-green-400 cursor-pointer"><div className="p-3 bg-gray-700 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div><span className="text-xs">Minha Conta</span></div>
                                        <div onClick={() => { setCurrentView('history'); setIsProfileMenuOpen(false); }} className="flex flex-col items-center space-y-1 text-gray-300 hover:text-green-400 cursor-pointer"><div className="p-3 bg-gray-700 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><span className="text-xs">Histórico</span></div>
                                    </div>
                                    <div className="border-t border-gray-700 p-2"><button onClick={handleLogout} className="w-full text-left text-sm py-2 px-3 text-red-500 hover:bg-gray-700 rounded">Sair</button></div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>
                <main className="grid grid-cols-1 md:grid-cols-4 gap-8">
                    <aside className="md:col-span-1 bg-gray-800 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-4 text-green-400">Competições</h3>
                        <ul className="space-y-2">
                            {competitions.map(comp => (
                                <li key={comp.id}>
                                    <button onClick={() => { setSelectedCompetition(comp.id); setCurrentView('home'); }} className={`w-full text-left p-2 rounded text-sm ${selectedCompetition === comp.id ? 'bg-green-500 text-white font-bold' : 'hover:bg-gray-700'}`}>
                                        {comp.name}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </aside>
                    <div className="md:col-span-2">
                        {renderMainView()}
                    </div>
                    <aside className="md:col-span-1 sticky top-8">
                        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
                            <div className="flex border-b border-gray-700 mb-4">
                                <button onClick={() => setBetType('simple')} className={`py-2 px-4 text-sm font-semibold w-1/2 ${betType === 'simple' ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-400'}`}>Simples</button>
                                <button onClick={() => setBetType('multiple')} className={`py-2 px-4 text-sm font-semibold w-1/2 ${betType === 'multiple' ? 'border-b-2 border-green-500 text-green-500' : 'text-gray-400'}`}>Múltipla</button>
                            </div>
                            {betSlip.length === 0 ? <p className="text-gray-400 text-center py-4">Selecione uma ou mais odds.</p> : (
                                <div>
                                    {betType === 'multiple' ? (
                                        <div>
                                            <div className="space-y-2 mb-4">
                                                {betSlip.map(s => <div key={s.matchId} className="bg-gray-700/50 p-2 rounded-md border-l-4 border-green-500 text-sm"><p className="font-semibold text-white">{s.match}</p><p className="flex justify-between items-center"><span>Escolha: <span className="font-bold text-amber-400">{s.pick}</span></span><span className="font-bold text-white">{s.odds.toFixed(2)}</span></p></div>)}
                                            </div>
                                            <div className="bg-gray-900/50 p-3 rounded-md text-center"><p className="text-sm text-gray-300">Odd Total da Múltipla</p><p className="text-2xl font-bold text-green-400">{totalOdd.toFixed(2)}</p></div>
                                            <label htmlFor="stake-input" className="block text-sm font-medium text-gray-300 mt-4">Valor da Aposta (R$)</label>
                                            <input type="number" value={multipleStake} onChange={(e) => setMultipleStake(e.target.value)} id="stake-input" className="w-full bg-gray-700 border-2 border-gray-600 rounded-md p-2 mt-1 text-white focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="0.00"/>
                                            <div className="mt-4 text-sm space-y-2"><p className="flex justify-between font-bold mt-2 text-lg"><span>Ganhos Potenciais:</span> <span className="text-green-400">{formatCurrency(potentialWinnings)}</span></p></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {betSlip.map(s => (
                                                <div key={s.matchId}>
                                                    <div className="bg-gray-700/50 p-2 rounded-md border-l-4 border-green-500 text-sm"><p className="font-semibold text-white">{s.match}</p><p className="flex justify-between items-center"><span>Escolha: <span className="font-bold text-amber-400">{s.pick}</span></span><span className="font-bold text-white">{s.odds.toFixed(2)}</span></p></div>
                                                    <input type="number" value={stakes[s.matchId] || ''} onChange={(e) => handleStakesChange(s.matchId, e.target.value)} className="w-full bg-gray-700 border-2 border-gray-600 rounded-md p-2 mt-1 text-white focus:outline-none focus:ring-2 focus:ring-amber-400" placeholder="Valor (R$)"/>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <button onClick={handlePlaceBet} disabled={isPlacingBet} className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold py-3 px-4 rounded-lg mt-4 transition-all duration-200 hover:scale-105 shadow-lg flex justify-center items-center disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isPlacingBet ? <div className="w-6 h-6 border-2 border-dashed rounded-full animate-spin border-gray-900"></div> : `APOSTAR ${betType.toUpperCase()}`}
                                    </button>
                                </div>
                            )}
                        </div>
                    </aside>
                </main>
            </div>
        </div>
    );
};

const HistoryView = ({ bets }) => (
    <div className="bg-gray-800 p-6 rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 text-green-400">Histórico de Apostas</h2>
        <div className="space-y-3">
            {bets.length === 0 ? <p className="text-gray-400 text-center py-4">Ainda não fez nenhuma aposta.</p> : (
                bets.map(bet => {
                    const getStatusClass = () => {
                        switch (bet.status) {
                            case 'won': return 'border-green-500 text-green-400';
                            case 'lost': return 'border-red-500 text-red-500';
                            case 'cashed_out': return 'border-blue-500 text-blue-400';
                            default: return 'border-gray-500 text-gray-300';
                        }
                    };
                    const getStatusText = () => {
                        switch (bet.status) {
                            case 'won': return `Ganhou (+${formatCurrency(bet.winnings)})`;
                            case 'lost': return 'Perdeu';
                            case 'cashed_out': return `Cash Out (${formatCurrency(bet.cashedOutAmount)})`;
                            default: return 'Pendente';
                        }
                    };
                    return (
                        <div key={bet.id} className={`p-3 rounded-md border-l-4 bg-gray-700/50 ${getStatusClass().split(' ')[0]}`}>
                            {bet.type === 'multiple' ? (
                                <div><p className="font-bold text-white">Aposta Múltipla <span className="text-amber-400">@{bet.totalOdd.toFixed(2)}</span></p>{bet.selections.map(sel => <p key={sel.matchId} className="text-xs text-gray-400 ml-2">› {sel.match}: <span className="font-semibold">{sel.pick}</span></p>)}</div>
                            ) : (
                                <div><p className="font-bold text-white">Aposta Simples <span className="text-amber-400">@{bet.selection.odds.toFixed(2)}</span></p><p className="text-xs text-gray-400 ml-2">› {bet.selection.match}: <span className="font-semibold">{bet.selection.pick}</span></p></div>
                            )}
                            <p className="text-sm text-gray-300 mt-2">Valor: {formatCurrency(bet.stake)}</p>
                            <p className={`text-sm font-bold mt-1 ${getStatusClass().split(' ')[1]}`}>{getStatusText()}</p>
                        </div>
                    )
                })
            )}
        </div>
    </div>
);

const PlaceholderView = ({ title, message }) => (
    <div className="bg-gray-800 p-6 rounded-lg text-center">
        <h2 className="text-2xl font-semibold mb-4 text-green-400">{title}</h2>
        <p className="text-gray-400">{message}</p>
    </div>
);


export default App;