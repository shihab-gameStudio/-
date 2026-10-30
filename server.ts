import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

app.use(express.json());

const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production' || fs.existsSync(path.join(__dirname, 'dist'));

if (isProduction) {
  app.use(express.static(path.join(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
} else {
  // In development, create Vite dev server middleware
  import('vite').then(async ({ createServer: createViteServer }) => {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false }
    });
    app.use(vite.middlewares);
  });
}

// In-memory 1v1 rooms authoritative state
interface RoomState {
  code: string;
  vendorId: string | null;
  policeId: string | null;
  vendorState: {
    x: number;
    z: number;
    heading: number;
    cash: number;
    level: number;
    stock: number;
    cap: number;
    sales: number;
    heat: number;
    alert: boolean;
  };
  policeState: {
    x: number;
    z: number;
    heading: number;
    cash: number;
    rank: number;
    arrests: number;
    integrity: number;
  };
  status: 'waiting' | 'playing' | 'ended';
}

const rooms = new Map<string, RoomState>();

io.on('connection', (socket: Socket) => {
  console.log('Player connected:', socket.id);

  socket.on('create_room', ({ role }: { role: 'vendor' | 'police' }) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const room: RoomState = {
      code,
      vendorId: role === 'vendor' ? socket.id : null,
      policeId: role === 'police' ? socket.id : null,
      vendorState: { x: 0, z: 7, heading: 0, cash: 250, level: 1, stock: 10, cap: 10, sales: 0, heat: 0, alert: false },
      policeState: { x: 0, z: -23, heading: 0, cash: 0, rank: 1, arrests: 0, integrity: 100 },
      status: 'waiting'
    };
    rooms.set(code, room);
    socket.join(code);
    socket.emit('room_created', { code, role, room });
  });

  socket.on('join_room', ({ code }: { code: string }) => {
    const room = rooms.get(code.toUpperCase());
    if (!room) {
      socket.emit('error_message', 'Room not found.');
      return;
    }
    let assignedRole: 'vendor' | 'police' = 'vendor';
    if (!room.vendorId) {
      room.vendorId = socket.id;
      assignedRole = 'vendor';
    } else if (!room.policeId) {
      room.policeId = socket.id;
      assignedRole = 'police';
    } else {
      socket.emit('error_message', 'Room is full.');
      return;
    }

    if (room.vendorId && room.policeId) {
      room.status = 'playing';
    }

    socket.join(room.code);
    io.to(room.code).emit('room_joined', { room, assignedRole });
  });

  socket.on('player_move', (data: { code: string; role: 'vendor' | 'police'; x: number; z: number; heading: number }) => {
    const room = rooms.get(data.code);
    if (!room) return;
    if (data.role === 'vendor') {
      room.vendorState.x = data.x;
      room.vendorState.z = data.z;
      room.vendorState.heading = data.heading;
    } else {
      room.policeState.x = data.x;
      room.policeState.z = data.z;
      room.policeState.heading = data.heading;
    }
    socket.to(data.code).emit('opponent_moved', data);
  });

  socket.on('action_event', (data: { code: string; type: string; payload: any }) => {
    const room = rooms.get(data.code);
    if (!room) return;
    // Authoritative state updates
    if (data.type === 'complete_sale') {
      room.vendorState.cash += data.payload.price;
      room.vendorState.stock--;
      room.vendorState.sales++;
      room.vendorState.heat = Math.min(100, room.vendorState.heat + 20);
    } else if (data.type === 'upgrade') {
      room.vendorState.cash -= data.payload.cost;
      room.vendorState.level++;
      room.vendorState.cap += 3;
      room.vendorState.stock += 3;
    } else if (data.type === 'arrest') {
      room.policeState.arrests++;
      room.policeState.rank = Math.min(4, 1 + Math.floor(room.policeState.arrests / 2));
      room.vendorState.heat = 0;
    } else if (data.type === 'bribe') {
      room.vendorState.cash -= data.payload.cost;
      room.policeState.cash += data.payload.cost;
      room.vendorState.heat = 0;
    }
    io.to(data.code).emit('state_updated', room);
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    for (const [code, room] of rooms.entries()) {
      if (room.vendorId === socket.id || room.policeId === socket.id) {
        io.to(code).emit('opponent_disconnected', { id: socket.id });
        rooms.delete(code);
      }
    }
  });
});

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
