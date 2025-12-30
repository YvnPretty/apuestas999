import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, Wallet, MessageSquare, Shield, Info, ArrowUpRight, ArrowDownRight, PlusCircle } from 'lucide-react';

const App = () => {
    const [market, setMarket] = useState(null);
    const [markets, setMarkets] = useState([]);
    const [userId, setUserId] = useState('Cartman');
    const [amount, setAmount] = useState(10);
    const [price, setPrice] = useState(0.5);
    const [newQuestion, setNewQuestion] = useState('');
    const [ws, setWs] = useState(null);

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:3001');

        socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'UPDATE_MARKET' || data.type === 'MARKET_RESOLVED') {
                setMarkets(prev => prev.map(m => m.id === data.market.id ? data.market : m));
                if (market && market.id === data.market.id) {
                    setMarket(data.market);
                }
            }
            if (data.type === 'NEW_MARKET') {
                setMarkets(prev => {
                    if (prev.find(m => m.id === data.market.id)) return prev;
                    return [...prev, data.market];
                });
            }
        };

        setWs(socket);

        fetch('http://localhost:3001/api/markets')
            .then(res => res.json())
            .then(data => {
                setMarkets(data);
                if (data.length > 0) setMarket(data[0]);
            });

        return () => socket.close();
    }, [market?.id]);

    const handleCreateMarket = async () => {
        if (!newQuestion) return;
        const res = await fetch('http://localhost:3001/api/markets/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: newQuestion })
        });
        const data = await res.json();
        setMarket(data.market);
        setNewQuestion('');
    };

    const handleTrade = async (type, side) => {
        await fetch('http://localhost:3001/api/order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                marketId: market.id,
                userId,
                type,
                side,
                price: parseFloat(price),
                amount: parseInt(amount)
            })
        });
    };

    const handleResolve = async (outcome) => {
        await fetch('http://localhost:3001/api/resolve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                marketId: market.id,
                outcome
            })
        });
    };

    const chartData = useMemo(() => {
        if (!market || !market.trades) return [];
        return market.trades.map((t, i) => ({
            time: i,
            price: t.price
        }));
    }, [market]);

    if (!market) return <div className="container">Cargando mercados...</div>;

    const user = market.users[userId] || { balance: 0, position: 0 };

    return (
        <div className="container">
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: 1 }}>
                    <div className="label">Prediction Market</div>
                    <h1>{market.question}</h1>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div className="glass" style={{ padding: '10px 20px' }}>
                        <div className="label">Seleccionar Mercado</div>
                        <select
                            value={market.id}
                            onChange={(e) => setMarket(markets.find(m => m.id === e.target.value))}
                            style={{ background: 'transparent', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', fontSize: '1rem' }}
                        >
                            {markets.map(m => <option key={m.id} value={m.id}>{m.question}</option>)}
                        </select>
                    </div>

                    <div className="glass" style={{ padding: '15px 25px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <Wallet size={20} color="#00f2ff" />
                        <div>
                            <div className="label">Tu Saldo ({userId})</div>
                            <div style={{ fontSize: '1.2rem', fontWeight: '800' }}>${user.balance.toFixed(2)}</div>
                        </div>
                        <select
                            value={userId}
                            onChange={(e) => setUserId(e.target.value)}
                            style={{ background: 'transparent', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer', marginLeft: '10px' }}
                        >
                            {Object.keys(market.users).map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                    </div>
                </div>
            </header>

            <div className="grid">
                <div className="main-col">
                    <div className="glass card" style={{ marginBottom: '30px' }}>
                        <div className="label" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <PlusCircle size={16} /> ✨ Crear Nueva Encuesta
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
                            <input
                                placeholder="Ej: ¿Lloverá mañana en CDMX?"
                                value={newQuestion}
                                onChange={(e) => setNewQuestion(e.target.value)}
                                style={{ flex: 1 }}
                            />
                            <button className="btn btn-primary" onClick={handleCreateMarket}>Crear</button>
                        </div>
                    </div>

                    <div className="glass card" style={{ height: '400px' }}>
                        <div className="label">Probabilidades en Vivo</div>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#00f2ff" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#00f2ff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 1]} stroke="#555" />
                                <Tooltip
                                    contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#00f2ff' }}
                                />
                                <Area type="monotone" dataKey="price" stroke="#00f2ff" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={3} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="glass card" style={{ marginTop: '30px' }}>
                        <div className="label">Historial de Transacciones</div>
                        <div style={{ marginTop: '20px' }}>
                            {market.trades.slice().reverse().map((trade, i) => (
                                <div key={i} className="trade-row">
                                    <span>{trade.buyerId} compró a {trade.sellerId}</span>
                                    <span style={{ fontWeight: '800', color: trade.price > 0.5 ? '#00ff88' : '#ff0055' }}>
                                        {trade.amount} acciones @ ${trade.price.toFixed(2)}
                                    </span>
                                </div>
                            ))}
                            {market.trades.length === 0 && <div style={{ color: '#555', textAlign: 'center' }}>No hay transacciones aún</div>}
                        </div>
                    </div>
                </div>

                <div className="side-col">
                    <div className="glass card">
                        <div className="label">Panel de Trading</div>
                        <div style={{ marginTop: '20px' }}>
                            <div className="input-group">
                                <div className="label">Cantidad de Acciones</div>
                                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <div className="label">Precio Límite ($)</div>
                                <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <button className="btn btn-success" onClick={() => handleTrade('BUY', 'YES')}>Apostar SÍ</button>
                                <button className="btn btn-danger" onClick={() => handleTrade('SELL', 'YES')}>Apostar NO</button>
                            </div>
                        </div>
                    </div>

                    <div className="glass card">
                        <div className="label">Tu Posición</div>
                        <div style={{ marginTop: '15px' }}>
                            <div style={{ fontSize: '2rem', fontWeight: '800' }}>{user.position} <span style={{ fontSize: '1rem', color: '#555' }}>acciones</span></div>
                            <div className="label" style={{ marginTop: '10px' }}>Valor Estimado</div>
                            <div style={{ color: user.position >= 0 ? '#00ff88' : '#ff0055' }}>
                                ${(user.position * (market.trades.length > 0 ? market.trades[market.trades.length - 1].price : 0.5)).toFixed(2)}
                            </div>
                        </div>
                    </div>

                    <div className="glass card" style={{ border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <div className="label">Admin: Resolver Mercado</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                            <button className="btn btn-primary" style={{ fontSize: '0.7rem' }} onClick={() => handleResolve(1)}>Ganó SÍ</button>
                            <button className="btn btn-primary" style={{ fontSize: '0.7rem', filter: 'hue-rotate(90deg)' }} onClick={() => handleResolve(0)}>Ganó NO</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
