const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// --- Matching Engine Logic ---

class Order {
    constructor(userId, type, side, price, amount) {
        this.id = uuidv4();
        this.userId = userId;
        this.type = type; // 'BUY' or 'SELL'
        this.side = side; // 'YES' or 'NO'
        this.price = price;
        this.amount = amount;
        this.timestamp = Date.now();
    }
}

let markets = {
    'kyle-war': {
        id: 'kyle-war',
        question: '¿Iniciará Kyle una guerra con Cartman?',
        bids: [], // Compras de SI (ordenadas por precio desc)
        asks: [], // Ventas de SI (ordenadas por precio asc)
        trades: [],
        users: {
            'Cartman': { balance: 1000, position: 0 },
            'Stan': { balance: 1000, position: 0 },
            'Kenny': { balance: 1000, position: 0 },
            'Butters': { balance: 1000, position: 0 }
        }
    }
};

function broadcast(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
        }
    });
}

function processOrder(marketId, order) {
    const market = markets[marketId];
    if (!market) return;

    if (!market.users[order.userId]) {
        market.users[order.userId] = { balance: 1000, position: 0 };
    }

    if (order.type === 'BUY' && order.side === 'YES') {
        matchBuy(market, order);
    } else if (order.type === 'SELL' && order.side === 'YES') {
        matchSell(market, order);
    }

    broadcast({ type: 'UPDATE_MARKET', marketId, market });
}

function matchBuy(market, buyOrder) {
    while (buyOrder.amount > 0 && market.asks.length > 0) {
        market.asks.sort((a, b) => a.price - b.price);
        let bestAsk = market.asks[0];

        if (buyOrder.price < bestAsk.price) break;

        let matchAmount = Math.min(buyOrder.amount, bestAsk.amount);
        executeTrade(market, buyOrder.userId, bestAsk.userId, matchAmount, bestAsk.price);

        buyOrder.amount -= matchAmount;
        bestAsk.amount -= matchAmount;

        if (bestAsk.amount === 0) market.asks.shift();
    }

    if (buyOrder.amount > 0) {
        market.bids.push(buyOrder);
        market.bids.sort((a, b) => b.price - a.price);
    }
}

function matchSell(market, sellOrder) {
    while (sellOrder.amount > 0 && market.bids.length > 0) {
        market.bids.sort((a, b) => b.price - a.price);
        let bestBid = market.bids[0];

        if (sellOrder.price > bestBid.price) break;

        let matchAmount = Math.min(sellOrder.amount, bestBid.amount);
        executeTrade(market, bestBid.userId, sellOrder.userId, matchAmount, bestBid.price);

        sellOrder.amount -= matchAmount;
        bestBid.amount -= matchAmount;

        if (bestBid.amount === 0) market.bids.shift();
    }

    if (sellOrder.amount > 0) {
        market.asks.push(sellOrder);
        market.asks.sort((a, b) => a.price - b.price);
    }
}

function executeTrade(market, buyerId, sellerId, amount, price) {
    const cost = amount * price;
    market.users[buyerId].balance -= cost;
    market.users[buyerId].position += amount;
    market.users[sellerId].balance += cost;
    market.users[sellerId].position -= amount;

    const trade = { buyerId, sellerId, amount, price, timestamp: Date.now() };
    market.trades.push(trade);
    console.log(`Trade: ${amount} @ ${price} between ${buyerId} and ${sellerId}`);
}

// --- API Endpoints ---

app.get('/api/markets', (req, res) => {
    res.json(Object.values(markets));
});

app.post('/api/markets/create', (req, res) => {
    const { question } = req.body;
    const id = question.toLowerCase().replace(/ /g, '-').replace(/[?¿!¡]/g, '') + '-' + Date.now();

    markets[id] = {
        id: id,
        question: question,
        bids: [],
        asks: [],
        trades: [],
        users: {
            'Cartman': { balance: 1000, position: 0 },
            'Stan': { balance: 1000, position: 0 },
            'Kenny': { balance: 1000, position: 0 },
            'Butters': { balance: 1000, position: 0 }
        }
    };

    broadcast({ type: 'NEW_MARKET', market: markets[id] });
    res.json({ status: 'success', market: markets[id] });
});

app.post('/api/order', (req, res) => {
    const { marketId, userId, type, side, price, amount } = req.body;
    const order = new Order(userId, type, side, price, amount);
    processOrder(marketId, order);
    res.json({ status: 'success', orderId: order.id });
});

app.post('/api/resolve', (req, res) => {
    const { marketId, outcome } = req.body; // outcome: 1 for YES, 0 for NO
    const market = markets[marketId];
    if (!market) return res.status(404).send('Market not found');

    Object.keys(market.users).forEach(userId => {
        const user = market.users[userId];
        user.balance += user.position * outcome;
        user.position = 0;
    });

    broadcast({ type: 'MARKET_RESOLVED', marketId, outcome, market });
    res.json({ status: 'resolved', market });
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});
