import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { io, Socket } from 'socket.io-client';
import { GameState, Role, GameMode, GameStage } from './types/game';
import { ThreeSceneManager } from './game/ThreeScene';
import { TitleScreen } from './components/TitleScreen';
import { GameHUD } from './components/GameHUD';
import { EventModal } from './components/EventModal';
import { MobileControls } from './components/MobileControls';
import { RoomModal } from './components/RoomModal';
import { productNames } from './game/constants';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<ThreeSceneManager | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const [stage, setStage] = useState<GameStage>('title');
  const [state, setState] = useState<GameState>({
    mode: 'solo',
    role: 'vendor',
    stage: 'title',
    cash: 250,
    policeCash: 0,
    level: 1,
    cap: 10,
    stock: 10,
    sales: 0,
    total: 0,
    heat: 0,
    alert: false,
    escape: 0,
    cooldown: 0,
    sale: null,
    rank: 1,
    arrests: 0,
    integrity: 100,
    stall: null,
    time: 0,
    heading: 0,
    speed: 0,
    aiHeading: 0
  });

  const [noticeText, setNoticeText] = useState('Welcome to ঠেলার নাম বাবাজি! Choose your role.');
  const [modalData, setModalData] = useState<{
    title: string;
    eyebrow: string;
    text: string;
    buttons: { text: string; onClick: () => void; isSecondary?: boolean }[];
  } | null>(null);

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [assignedRole, setAssignedRole] = useState<Role | null>(null);
  const [muted, setMuted] = useState(false);

  const keysRef = useRef<Set<string>>(new Set());

  const notify = (text: string) => {
    setNoticeText(text);
  };

  const vector2 = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    const mgr = new ThreeSceneManager(
      containerRef.current,
      () => {},
      () => {}
    );
    managerRef.current = mgr;

    const handleResize = () => mgr.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      mgr.destroy();
    };
  }, []);

  // Keyboard and input listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
      if (e.repeat) return;
      const normalized = key === 'arrowup' ? 'w' : key === 'arrowleft' ? 'a' : key === 'arrowright' ? 'd' : key === 'arrowdown' ? 's' : key;
      keysRef.current.add(normalized);
      handleAction(normalized);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      let k = e.key.toLowerCase();
      if (k === 'arrowup') k = 'w';
      if (k === 'arrowleft') k = 'a';
      if (k === 'arrowdown') k = 's';
      if (k === 'arrowright') k = 'd';
      keysRef.current.delete(k);
    };

    const handleBlur = () => keysRef.current.clear();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [state, modalData]);

  // Game action handler
  const handleAction = (k: string) => {
    if (stage !== 'playing' || modalData) return;
    if (k === 'e') {
      if (state.role === 'vendor') beginSale();
      else arrestVendor();
    } else if (k === 'u') {
      upgradeCart();
    } else if (k === 'r') {
      restockInventory();
    } else if (k === 'b') {
      placeBigStall();
    } else if (k === 'c') {
      if (managerRef.current) {
        const cam = managerRef.current.camera;
        cam.fov = cam.fov === 66 ? 80 : 66;
        cam.updateProjectionMatrix();
        notify('Camera zoom changed');
      }
    }
  };

  const handleMobileHold = (key: string, isDown: boolean) => {
    if (isDown) keysRef.current.add(key);
    else keysRef.current.delete(key);
  };

  // Vendor actions
  const beginSale = () => {
    if (state.role !== 'vendor' || state.sale || state.stock <= 0 || state.cooldown > 0 || !managerRef.current) return;
    const mgr = managerRef.current;
    let nearest = null;
    let d = 99;
    for (const c of mgr.customers) {
      const dist = vector2(mgr.human.position, c.mesh.position);
      if (dist < d) {
        d = dist;
        nearest = c;
      }
    }
    if (d > 4.8) {
      notify('Get closer to a customer to sell.');
      return;
    }
    const seconds = mgr.rand(5, 10);
    const product = mgr.pick(productNames);
    const price = Math.max(20, Math.round((23 + seconds * 9 + mgr.rand(-14, 17)) * (1 + (state.level - 1) * 0.28)));
    setState(s => ({
      ...s,
      sale: { seconds, start: s.time, price, product, customer: nearest }
    }));
    notify(`${product} · selling for ${seconds.toFixed(1)}s · ৳${price}`);
  };

  const upgradeCart = () => {
    if (state.role !== 'vendor') return;
    if (state.level >= 12) {
      notify('Maximum cart level reached.');
      return;
    }
    const cost = 130 + state.level * 85;
    if (state.cash < cost) {
      notify(`Need ৳${cost} to upgrade, you have ৳${state.cash}.`);
      return;
    }
    setState(s => ({
      ...s,
      cash: s.cash - cost,
      level: s.level + 1,
      cap: s.cap + 3,
      stock: s.stock + 3,
      heat: Math.min(100, s.heat + 5)
    }));
    notify(`Cart level ${state.level + 1}! Higher earnings and risk.`);
  };

  const restockInventory = () => {
    if (state.role !== 'vendor') return;
    const needed = state.cap - state.stock;
    const cost = needed * 7;
    if (needed === 0) {
      notify('Inventory is full.');
      return;
    }
    if (cost > state.cash) {
      notify(`Restock costs ৳${cost}. Earn more cash.`);
      return;
    }
    setState(s => ({
      ...s,
      cash: s.cash - cost,
      stock: s.cap
    }));
    notify(`Restocked ${needed} items for ৳${cost}.`);
  };

  const placeBigStall = () => {
    if (state.role !== 'vendor') return;
    if (state.level < 10) {
      notify('Unlock large food stall at cart level 10.');
      return;
    }
    if (state.stall) {
      notify('Your large stall is already placed.');
      return;
    }
    if (!managerRef.current) return;
    const mgr = managerRef.current;
    const g = mgr.human.clone();
    g.position.set(mgr.human.position.x + 3, 0, mgr.human.position.z + 3);
    g.scale.set(1.8, 1.35, 1.8);
    mgr.scene.add(g);
    setState(s => ({ ...s, stall: g, heat: 100 }));
    notify('Large food stall opened! Higher earnings, high enforcement risk.');
  };

  const bribeDemand = () => {
    const cost = 90 + state.level * 45;
    setState(s => ({ ...s, sale: null, alert: false }));
    setModalData({
      title: 'Caught by Police',
      eyebrow: 'FICTIONAL STORY EVENT',
      text: `This is a fictional satirical encounter. Pay an unlawful in-game bribe of ৳${cost} or be sent to jail. No real payments.`,
      buttons: [
        {
          text: `Pay ৳${cost}`,
          onClick: () => {
            if (state.cash < cost) {
              triggerGameOver('You could not pay the fictional demand. Jail ends the vendor run.');
              return;
            }
            setState(s => ({
              ...s,
              cash: s.cash - cost,
              heat: 0,
              cooldown: 10
            }));
            if (managerRef.current) {
              managerRef.current.officer.position.set(
                managerRef.current.human.position.x + 26,
                0,
                managerRef.current.human.position.z - 22
              );
            }
            setModalData(null);
            notify('Released. Stay clear until cooldown finishes.');
          }
        },
        {
          text: 'Go to Jail',
          onClick: () => {
            triggerGameOver(`You sold ${state.sales} items and earned ৳${state.total}.`);
          },
          isSecondary: true
        }
      ]
    });
  };

  const arrestVendor = () => {
    if (state.role !== 'police' || !managerRef.current) return;
    const mgr = managerRef.current;
    const d = vector2(mgr.officer.position, mgr.npcVendor.position);
    if (d > 3.2) {
      notify('Move close to the vendor before arresting.');
      return;
    }
    setModalData({
      title: 'Vendor Caught',
      eyebrow: 'PURSUE OR DECIDE',
      text: 'Record a lawful arrest to advance your police career, or take an unlawful fictional payment and lose integrity.',
      buttons: [
        {
          text: 'Record Arrest',
          onClick: () => {
            setState(s => {
              const newArrests = s.arrests + 1;
              const newRank = Math.min(4, 1 + Math.floor(newArrests / 2));
              mgr.npcVendor.position.set(mgr.rand(-45, -27), 0, mgr.rand(24, 50));
              if (newArrests >= 5) notify('Magistrate Operation EVENT unlocked!');
              else notify('Arrest recorded. Promotion progress +1.');
              return { ...s, arrests: newArrests, rank: newRank, integrity: Math.min(100, s.integrity + 2) };
            });
            setModalData(null);
          }
        },
        {
          text: 'Take Illicit ৳150',
          onClick: () => {
            setState(s => {
              mgr.npcVendor.position.set(mgr.rand(-45, -27), 0, mgr.rand(24, 50));
              notify('Illicit payment received. No arrest credit; integrity reduced.');
              return { ...s, policeCash: s.policeCash + 150, integrity: Math.max(0, s.integrity - 20) };
            });
            setModalData(null);
          },
          isSecondary: true
        }
      ]
    });
  };

  const triggerGameOver = (text: string) => {
    setModalData({
      title: 'RUN OVER',
      eyebrow: 'ঠেলার নাম বাবাজি · ARCADE',
      text,
      buttons: [
        {
          text: 'Try Again',
          onClick: () => {
            setModalData(null);
            startGame(state.role, state.mode);
          }
        },
        {
          text: 'Main Menu',
          onClick: () => {
            setModalData(null);
            setStage('title');
          },
          isSecondary: true
        }
      ]
    });
  };

  const startGame = (role: Role, mode: GameMode = 'solo') => {
    setStage('playing');
    setState({
      mode,
      role,
      stage: 'playing',
      cash: 250,
      policeCash: 0,
      level: 1,
      cap: 10,
      stock: 10,
      sales: 0,
      total: 0,
      heat: 0,
      alert: false,
      escape: 0,
      cooldown: 0,
      sale: null,
      rank: 1,
      arrests: 0,
      integrity: 100,
      stall: null,
      time: 0,
      heading: 0,
      speed: 0,
      aiHeading: 0
    });

    if (managerRef.current) {
      const mgr = managerRef.current;
      mgr.human.visible = role === 'vendor';
      mgr.officer.visible = true;
      mgr.npcVendor.visible = role === 'police';
      mgr.human.position.set(0, 0, 7);
      mgr.officer.position.set(0, 0, -23);
      mgr.npcVendor.position.set(0, 0, -19);
    }
    notify(role === 'vendor' ? 'Sell products, then escape police!' : 'Patrol the streets and catch the vendor!');
  };

  // Online multiplayer room creation / joining
  const handleCreateRoom = (role: Role) => {
    if (!socketRef.current) {
      socketRef.current = io();
      setupSocketListeners();
    }
    socketRef.current.emit('create_room', { role });
  };

  const handleJoinRoom = (code: string) => {
    if (!socketRef.current) {
      socketRef.current = io();
      setupSocketListeners();
    }
    socketRef.current.emit('join_room', { code });
  };

  const setupSocketListeners = () => {
    const sock = socketRef.current;
    if (!sock) return;

    sock.on('room_created', data => {
      setRoomCode(data.code);
      setAssignedRole(data.role);
    });

    sock.on('room_joined', data => {
      setRoomCode(data.room.code);
      setAssignedRole(data.assignedRole);
      setRoomModalOpen(false);
      startGame(data.assignedRole, 'online');
    });

    sock.on('error_message', msg => {
      alert(msg);
    });

    sock.on('opponent_moved', data => {
      if (!managerRef.current) return;
      const mgr = managerRef.current;
      const target = data.role === 'vendor' ? mgr.human : mgr.officer;
      target.position.set(data.x, 0, data.z);
      target.rotation.y = data.heading;
    });

    sock.on('state_updated', room => {
      // Sync online state
    });
  };

  // Simulation loop via requestAnimationFrame
  useEffect(() => {
    if (stage !== 'playing' || !managerRef.current) return;
    const mgr = managerRef.current;
    let animId = 0;
    const clock = new THREE.Clock();
    let acc = 0;

    const simulate = (dt: number) => {
      setState(s => {
        if (modalData || s.stage !== 'playing') return s;
        const newTime = s.time + dt;

        // Move player
        const p = s.role === 'vendor' ? mgr.human : mgr.officer;
        const keys = keysRef.current;
        const turn = (keys.has('a') ? 1 : 0) - (keys.has('d') ? 1 : 0);
        const newHeading = s.heading + turn * dt * 2.15;
        const throttle = (keys.has('w') ? 1 : 0) - (keys.has('s') ? 0.55 : 0);
        const sprint = keys.has(' ') || keys.has('shift');
        const speed = (s.role === 'vendor' ? 4.65 : 5.4) * (sprint ? 1.65 : 1) * throttle;

        const nx = p.position.x + Math.sin(newHeading) * speed * dt;
        const nz = p.position.z - Math.cos(newHeading) * speed * dt;
        const invalid = mgr.obstacles.some(b => Math.abs(nx - b.x) < b.hw + 0.7 && Math.abs(nz - b.z) < b.hd + 0.7);

        if (!invalid && Math.abs(nx) < 111 && Math.abs(nz) < 111) {
          p.position.set(nx, 0, nz);
          p.rotation.y = newHeading;
        }

        // Emit online position if in online mode
        if (s.mode === 'online' && socketRef.current && roomCode && speed !== 0) {
          socketRef.current.emit('player_move', {
            code: roomCode,
            role: s.role,
            x: p.position.x,
            z: p.position.z,
            heading: newHeading
          });
        }

        // AI / AI police pursuit
        let newHeat = s.heat;
        let newAlert = s.alert;
        let newCooldown = Math.max(0, s.cooldown - dt);
        let newEscape = s.escape;

        if (s.mode === 'solo') {
          if (s.role === 'vendor') {
            if (s.heat > 27 && s.cooldown === 0 && vector2(mgr.human.position, mgr.officer.position) < 55) {
              newAlert = true;
            }
            const toHuman = new THREE.Vector3().subVectors(mgr.human.position, mgr.officer.position);
            const dist = toHuman.length();
            if (newAlert) {
              const dir = toHuman.clone();
              dir.y = 0;
              dir.normalize();
              mgr.officer.position.addScaledVector(dir, Math.min(dist, 1) * 3.55 * dt);
              mgr.officer.rotation.y = Math.atan2(dir.x, -dir.z);
              if (dist < 2.1) {
                bribeDemand();
              } else if (dist > 30) {
                newEscape += dt;
                if (newEscape > 5) {
                  newAlert = false;
                  newHeat = Math.max(0, s.heat - 30);
                  newCooldown = 11;
                  newEscape = 0;
                  notify('Escaped! Stay out of sight during cooldown.');
                }
              } else {
                newEscape = 0;
              }
            } else {
              const angle = newTime * 0.3;
              mgr.officer.position.x += Math.sin(angle) * dt * 1.1;
              mgr.officer.position.z += Math.cos(angle * 0.7) * dt * 0.9;
              mgr.officer.position.x = THREE.MathUtils.clamp(mgr.officer.position.x, -100, 100);
              mgr.officer.position.z = THREE.MathUtils.clamp(mgr.officer.position.z, -100, 100);
            }
            if (!newAlert && newHeat > 0) newHeat = Math.max(0, newHeat - dt * 0.9);
          } else {
            // Police AI vendor
            const t = newTime;
            const d = vector2(mgr.officer.position, mgr.npcVendor.position);
            if (d < 13) {
              let dx = mgr.npcVendor.position.x - mgr.officer.position.x;
              let dz = mgr.npcVendor.position.z - mgr.officer.position.z;
              const n = Math.hypot(dx, dz) || 1;
              dx /= n;
              dz /= n;
              mgr.npcVendor.position.x += dx * dt * 3.8;
              mgr.npcVendor.position.z += dz * dt * 3.8;
              mgr.npcVendor.rotation.y = Math.atan2(dx, -dz);
            } else {
              mgr.npcVendor.position.x += Math.sin(t * 0.58) * dt * 2.2;
              mgr.npcVendor.position.z += Math.cos(t * 0.34) * dt * 2.2;
              mgr.npcVendor.rotation.y = Math.sin(t * 0.58) * 1.3;
            }
            mgr.npcVendor.position.x = THREE.MathUtils.clamp(mgr.npcVendor.position.x, -104, 104);
            mgr.npcVendor.position.z = THREE.MathUtils.clamp(mgr.npcVendor.position.z, -104, 104);
          }
        }

        // Customers drift
        for (const c of mgr.customers) {
          c.phase += dt * c.drift;
          const m = c.mesh;
          const nx = m.position.x + Math.sin(c.phase) * dt * 0.34;
          const nz = m.position.z + Math.cos(c.phase * 0.71) * dt * 0.36;
          if (
            Math.abs(nx) < 112 &&
            Math.abs(nz) < 112 &&
            !mgr.obstacles.some(b => Math.abs(nx - b.x) < b.hw + 0.65 && Math.abs(nz - b.z) < b.hd + 0.65)
          ) {
            m.position.x = nx;
            m.position.z = nz;
          }
          m.rotation.y = Math.sin(c.phase) * 0.7;
        }

        // Sale countdown check
        let newSale = s.sale;
        let newCash = s.cash;
        let newStock = s.stock;
        let newSales = s.sales;
        let newTotal = s.total;

        if (s.sale) {
          const elapsed = newTime - s.sale.start;
          if (vector2(mgr.human.position, s.sale.customer.mesh.position) > 6 || s.alert) {
            newSale = null;
            notify('Sale interrupted — no payment.');
          } else if (elapsed >= s.sale.seconds) {
            newCash += s.sale.price;
            newTotal += s.sale.price;
            newStock--;
            newSales++;
            newHeat = Math.min(100, newHeat + 18 + s.level * 3.7);
            notify(`Sold ${s.sale.product} · +৳${s.sale.price}! Police attention rising.`);
            newSale = null;
          }
        }

        // Traffic movement
        for (const item of mgr.traffic) {
          const pMesh = item.mesh.position;
          const d = item.v * dt;
          if (item.vertical) {
            pMesh.z += d;
            if (Math.abs(pMesh.z) > 112) pMesh.z = -Math.sign(pMesh.z) * 112;
          } else {
            pMesh.x += d;
            if (Math.abs(pMesh.x) > 112) pMesh.x = -Math.sign(pMesh.x) * 112;
          }
        }

        return {
          ...s,
          time: newTime,
          heading: newHeading,
          speed,
          heat: newHeat,
          alert: newAlert,
          cooldown: newCooldown,
          escape: newEscape,
          sale: newSale,
          cash: newCash,
          stock: newStock,
          sales: newSales,
          total: newTotal
        };
      });

      // Camera follow
      const p = state.role === 'vendor' ? mgr.human : mgr.officer;
      const forward = new THREE.Vector3(Math.sin(state.heading), 0, -Math.cos(state.heading));
      const target = p.position.clone().addScaledVector(forward, -11).add(new THREE.Vector3(0, 7, 0));
      mgr.camera.position.lerp(target, 0.08);
      const look = p.position.clone().addScaledVector(forward, 5).add(new THREE.Vector3(0, 2.2, 0));
      mgr.camera.lookAt(look);

      mgr.renderer.render(mgr.scene, mgr.camera);
      animId = requestAnimationFrame(loop);
    };

    const loop = () => {
      let dt = Math.min(clock.getDelta(), 0.05);
      acc += dt;
      if (acc > 0.045) {
        simulate(Math.min(acc, 0.05));
        acc = 0;
      } else {
        mgr.renderer.render(mgr.scene, mgr.camera);
        animId = requestAnimationFrame(loop);
      }
    };

    animId = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(animId);
  }, [stage, modalData, state.role, state.mode, roomCode]);

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-[#121c24]">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Title Screen */}
      {stage === 'title' && (
        <TitleScreen
          onStartSolo={role => startGame(role, 'solo')}
          onOpenRoom={() => setRoomModalOpen(true)}
        />
      )}

      {/* Game HUD */}
      {stage === 'playing' && (
        <GameHUD
          state={state}
          noticeText={noticeText}
          onCameraToggle={() => handleAction('c')}
          onPause={() => setStage('title')}
          muted={muted}
          onToggleMute={() => setMuted(!muted)}
        />
      )}

      {/* Mobile Controls Overlay */}
      {stage === 'playing' && (
        <MobileControls onAction={handleAction} onHold={handleMobileHold} />
      )}

      {/* Event Modal (Bribe / Arrest / Game Over) */}
      {modalData && (
        <EventModal
          title={modalData.title}
          eyebrow={modalData.eyebrow}
          text={modalData.text}
          buttons={modalData.buttons}
        />
      )}

      {/* Room Modal for 1v1 Online */}
      {roomModalOpen && (
        <RoomModal
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onClose={() => setRoomModalOpen(false)}
          roomCode={roomCode}
          assignedRole={assignedRole}
        />
      )}
    </div>
  );
}
