import React, { useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firebaseConfigured } from './firebase';
import { register, login, logout } from './services/auth';
import { ensurePlayer, getLeaderboard, saveGame } from './services/firestore';
import { Chess } from 'chess.js';
import { analyse, bestMove } from './services/stockfish';
import './styles.css';

const FILES = ['a','b','c','d','e','f','g','h'];
const PIECES = [
  ['Empty', ''], ['White king','wk'], ['White queen','wq'], ['White rook','wr'],
  ['White bishop','wb'], ['White knight','wn'], ['White pawn','wp'],
  ['Black king','bk'], ['Black queen','bq'], ['Black rook','br'],
  ['Black bishop','bb'], ['Black knight','bn'], ['Black pawn','bp']
];
const PIECE_CODES = {k:'k',q:'q',r:'r',b:'b',n:'n',p:'p'};
const ASSET_BASE = 'https://raw.githubusercontent.com/ShimeKano/covua/main/assneo';

function Board({ game, selected, targets, flipped, editorMode, editorSquare, onSquare }) {
  const rows = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const cols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  return <div className="boardWrap">
    <div className="rankLabels">{rows.map(r=><span key={r}>{r+1}</span>)}</div>
    <div className="boardColumn">
      <div className="board">{rows.flatMap(r=>cols.map(c=>{
        const sq=FILES[c]+(r+1), piece=game.get(sq), isLight=(r+c)%2===1;
        const isTarget=targets.includes(sq);
        const last=game.history({verbose:true}).slice(-1)[0];
        const isLast=last&&(last.from===sq||last.to===sq);
        return <button key={sq} aria-label={sq} className={'square '+(isLight?'light':'dark')+(selected===sq?' selected':'')+(isTarget?' target':'')+(editorMode&&editorSquare===sq?' editorSelected':'')+(isLast?' lastMove':'')} onClick={()=>onSquare(sq)}>
          {piece && <img className={'piece '+(piece.color==='w'?'whitePiece':'blackPiece')} src={ASSET_BASE+'/'+piece.color+PIECE_CODES[piece.type]+'.png'} alt={(piece.color==='w'?'White ':'Black ')+piece.type} draggable="false" onError={e=>{e.currentTarget.style.display='none';}}/>}
          {isTarget&&!piece&&<span className="moveDot"/>}
          {isTarget&&piece&&<span className="captureRing"/>}
        </button>;
      }))}</div>
      <div className="fileLabels">{cols.map(c=><span key={c}>{FILES[c]}</span>)}</div>
    </div>
  </div>;
}

function AuthBox() {
  const [mode,setMode]=useState('login'),[email,setEmail]=useState(''),[pass,setPass]=useState(''),[name,setName]=useState(''),[err,setErr]=useState('');
  async function go(e){e.preventDefault();setErr('');try{if(mode==='login')await login(email,pass);else await register(email,pass,name);}catch(x){setErr(x.message);}}
  return <form className="auth" onSubmit={go}><h2>{mode==='login'?'Đăng nhập':'Tạo tài khoản'}</h2>{mode==='register'&&<input placeholder="Tên người chơi" value={name} onChange={e=>setName(e.target.value)} required/>}<input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/><input type="password" placeholder="Mật khẩu" value={pass} onChange={e=>setPass(e.target.value)} minLength="6" required/><button className="primary">{mode==='login'?'Đăng nhập':'Đăng ký'}</button>{err&&<p className="error">{err}</p>}<button type="button" className="link" onClick={()=>setMode(mode==='login'?'register':'login')}>{mode==='login'?'Chưa có tài khoản? Đăng ký':'Đã có tài khoản? Đăng nhập'}</button></form>;
}

function App(){
  const [user,setUser]=useState(null),[game,setGame]=useState(()=>new Chess()),[selected,setSelected]=useState(null),[targets,setTargets]=useState([]),[leader,setLeader]=useState([]),[status,setStatus]=useState('Chọn màu quân rồi bấm Ván mới.'),[best,setBest]=useState(''),[skill,setSkill]=useState(8),[humanColor,setHumanColor]=useState('w'),[flipped,setFlipped]=useState(false),[thinking,setThinking]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState([new Chess().fen()]),[editorMode,setEditorMode]=useState(false),[editorSquare,setEditorSquare]=useState(null),[pieceChoice,setPieceChoice]=useState('wp'),[fenText,setFenText]=useState(new Chess().fen()),[editorStatus,setEditorStatus]=useState('');
  useEffect(()=>{if(!auth)return;return onAuthStateChanged(auth,async u=>{setUser(u);if(u)await ensurePlayer(u,u.email?.split('@')[0]);});},[]);
  useEffect(()=>{getLeaderboard().then(setLeader).catch(()=>{});},[user]);
  const gameOver=game.isGameOver();
  function resultStatus(g){if(g.isCheckmate())return 'Chiếu hết — '+(g.turn()==='w'?'Đen thắng!':'Trắng thắng!');if(g.isDraw())return 'Ván cờ hòa.';return g.isCheck()?'Chiếu!':'Lượt '+(g.turn()==='w'?'Trắng':'Đen');}
  function pushPosition(g){setGame(g);setFenText(g.fen());setHistory(h=>[...h,g.fen()]);setSelected(null);setTargets([]);setStatus(resultStatus(g));}
  async function runEngine(g,level=skill){if(g.isGameOver())return g;setThinking(true);setError('');setStatus('Stockfish đang suy nghĩ…');try{const uci=await bestMove(g.fen(),level,1000);if(!uci||uci==='(none)')throw new Error('Engine không trả về nước đi.');const next=new Chess(g.fen());const move=next.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||'q'});if(!move)throw new Error('Stockfish trả về nước đi không hợp lệ: '+uci);pushPosition(next);if(next.isGameOver()&&user)saveGame({uid:user.uid,fen:next.fen(),result:next.isDraw()?'draw':next.turn()===humanColor?'loss':'win',pgn:next.pgn()}).catch(()=>{});return next;}catch(e){setError('Stockfish chưa sẵn sàng: '+e.message);setStatus('Không thể lấy nước đi từ Stockfish.');return g;}finally{setThinking(false);}}
  async function newGame(){const g=new Chess();setGame(g);setHistory([g.fen()]);setSelected(null);setTargets([]);setEditorMode(false);setEditorSquare(null);setBest('');setError('');setFenText(g.fen());setFlipped(humanColor==='b');setStatus('Ván mới');if(humanColor==='b'){const after=await runEngine(g,skill);setHistory([after.fen()]);}else setStatus('Lượt Trắng — bạn đi trước.');}
  async function startFromFen(){try{const g=new Chess(fenText.trim());if(!g.isCheckmate()&&!g.isDraw()&&g.isCheck()&&false){}setGame(g);setHistory([g.fen()]);setSelected(null);setTargets([]);setEditorMode(false);setEditorSquare(null);setFlipped(humanColor==='b');setError('');setEditorStatus('Đã bắt đầu từ vị trí FEN.');setStatus(resultStatus(g));if(g.turn()!==humanColor&&!g.isGameOver()){const after=await runEngine(g,skill);setHistory([after.fen()]);}}catch(e){setEditorStatus('FEN không hợp lệ: '+e.message);}}
  async function onSquare(sq){if(thinking)return;setError('');if(editorMode){setEditorSquare(sq);return;}if(game.isGameOver()){setStatus(resultStatus(game));return;}if(game.turn()!==humanColor)return;
    if(!selected){const p=game.get(sq);if(p&&p.color===humanColor){setSelected(sq);setTargets(game.moves({square:sq,verbose:true}).map(m=>m.to));}return;}
    if(selected===sq){setSelected(null);setTargets([]);return;}
    const own=game.get(sq);if(own&&own.color===humanColor){setSelected(sq);setTargets(game.moves({square:sq,verbose:true}).map(m=>m.to));return;}
    try{const g=new Chess(game.fen());const m=g.move({from:selected,to:sq,promotion:'q'});if(!m){setSelected(null);setTargets([]);return;}pushPosition(g);if(g.isGameOver()){if(user)saveGame({uid:user.uid,fen:g.fen(),result:g.isDraw()?'draw':g.turn()===humanColor?'loss':'win',pgn:g.pgn()}).catch(()=>{});return;}await runEngine(g,skill);}catch{setSelected(null);setTargets([]);}
  }
  function undo(){if(thinking)return;if(history.length<2){setStatus('Chưa có nước đi để hoàn tác.');return;}const targetIndex=history.length>=3?history.length-3:history.length-2;const nextHistory=history.slice(0,targetIndex+1),g=new Chess(nextHistory[nextHistory.length-1]);setHistory(nextHistory);setGame(g);setFenText(g.fen());setSelected(null);setTargets([]);setError('');setStatus('Đã hoàn tác. '+resultStatus(g));}
  function analysePosition(){setBest('Đang phân tích…');analyse(game.fen(),12).then(uci=>{if(!uci||uci==='(none)'){setBest('Không có nước đi');return;}const g=new Chess(game.fen());const m=g.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||'q'});setBest(m?m.san+' ('+uci+')':uci);}).catch(e=>setBest('Phân tích lỗi: '+e.message));}
  function validateFen(){try{const g=new Chess(fenText.trim());setEditorStatus(g.isCheckmate()?'FEN hợp lệ — vị trí chiếu hết.':g.isDraw()?'FEN hợp lệ — vị trí hòa.':'FEN đọc được và hợp lệ.');}catch(e){setEditorStatus('FEN không hợp lệ: '+e.message);}}
  function applyFen(){try{const g=new Chess(fenText.trim());setGame(g);setHistory([g.fen()]);setSelected(null);setTargets([]);setEditorSquare(null);setEditorStatus('Đã áp dụng FEN lên bàn cờ.');setStatus(resultStatus(g));}catch(e){setEditorStatus('FEN không hợp lệ: '+e.message);}}
  function placePiece(){if(!editorMode){setEditorStatus('Hãy bật chế độ xếp cờ trước.');return;}if(!editorSquare){setEditorStatus('Hãy chọn một ô trên bàn cờ trước.');return;}try{const parts=fenText.trim().split(/\\s+/);if(!parts[0]||parts[0].split('/').length!==8)throw new Error('FEN cần có 8 hàng.');const rankIndex=8-Number(editorSquare[1]);const rows=parts[0].split('/');const cells=[];for(const ch of rows[rankIndex]){if(/[1-8]/.test(ch))for(let i=0;i<Number(ch);i++)cells.push('');else cells.push(ch);}if(cells.length!==8)throw new Error('Hàng FEN không hợp lệ.');const code=pieceChoice?((pieceChoice[0]==='w')?pieceChoice[1].toUpperCase():pieceChoice[1]):'';cells[FILES.indexOf(editorSquare[0])]=code;let empty=0,out='';for(const ch of cells){if(!ch){empty++;continue;}if(empty){out+=empty;empty=0;}out+=ch;}if(empty)out+=empty;rows[rankIndex]=out;parts[0]=rows.join('/');while(parts.length<6)parts.push(parts.length===1?'w':parts.length===2?'-':parts.length===3?'-':parts.length===4?'0':'1');const fen=parts.slice(0,6).join(' ');setFenText(fen);try{const g=new Chess(fen);setGame(g);setHistory([g.fen()]);setStatus(resultStatus(g));}catch{}setEditorStatus('Đã cập nhật ô '+editorSquare+' trong FEN. Nếu vị trí hợp lệ, bàn cờ đã được cập nhật; nếu chưa đủ hai vua, tiếp tục chỉnh rồi áp dụng.');}catch(e){setEditorStatus('Không thể chỉnh ô: '+e.message);}}
  function clearBoard(){const parts=game.fen().split(' ');setFenText('8/8/8/8/8/8/8/8 '+(parts[1]||'w')+' - - 0 1');setEditorStatus('Đã xóa toàn bộ quân trong FEN. Cần đặt đủ hai vua trước khi bắt đầu ván.');}
  function resetBoard(){setFenText(new Chess().fen());setEditorStatus('Đã khôi phục vị trí ban đầu trong FEN.');}
  return <main><header><div><h1>♟ Chess Web</h1><p>Chơi cờ vua với người chơi hoặc Stockfish chạy trực tiếp trên trình duyệt.</p></div>{user&&<button onClick={logout}>Đăng xuất</button>}</header>
  {!firebaseConfigured&&<div className="notice">Firebase chưa cấu hình. Stockfish và bàn cờ vẫn chạy cục bộ; tài khoản/bảng xếp hạng cần Firebase.</div>}
  {!user&&<section className="hero"><AuthBox/><div className="info"><h2>Cờ vua gọn nhẹ, engine chạy trên máy bạn.</h2><p>Đăng nhập để lưu thông tin người chơi và xem bảng xếp hạng.</p><ul><li>♟ Đấu với Stockfish</li><li>🎚️ Độ khó 0–20</li><li>🛠️ Chỉnh vị trí và FEN</li><li>📊 Bảng xếp hạng khi bật Firebase</li></ul></div></section>}
  <section className="gameLayout"><div className="gamePanel"><div className="gameTop"><strong>{status}</strong><div className="topButtons"><button onClick={newGame} disabled={thinking}>🎮 Ván mới</button><button onClick={undo} disabled={thinking}>⏪ Đi lại</button></div></div>
  <div className="settingsRow"><label>Màu của bạn <select value={humanColor} onChange={e=>setHumanColor(e.target.value)}><option value="w">Trắng</option><option value="b">Đen</option></select></label><label>Độ khó Stockfish: <b>{skill}/20</b><input type="range" min="0" max="20" value={skill} onChange={e=>setSkill(Number(e.target.value))}/></label><button onClick={()=>setFlipped(v=>!v)}>🔄 Lật bàn</button></div>
  <Board game={game} selected={selected} targets={targets} flipped={flipped} editorMode={editorMode} editorSquare={editorSquare} onSquare={onSquare}/>
  <div className="controls"><button onClick={analysePosition} disabled={thinking}>🧠 Phân tích vị trí</button><span>{best&&'Nước tốt nhất: '+best}</span></div>{error&&<p className="error">{error}</p>}
  <section className="editor"><button className="editorToggle" onClick={()=>{setEditorMode(v=>!v);setEditorSquare(null);setEditorStatus(!editorMode?'Bật chế độ xếp cờ: click một ô trên bàn cờ.':'Đã thoát chế độ xếp cờ.')}}>{editorMode?'↩️ Thoát xếp cờ':'🛠️ Chế độ xếp cờ'}</button>
  {editorMode&&<div className="editorTools"><p>Chọn một ô trên bàn cờ, chọn quân rồi bấm Đặt/thay. Bạn cũng có thể sửa FEN trực tiếp.</p><label>Quân muốn đặt / thay<select value={pieceChoice} onChange={e=>setPieceChoice(e.target.value)}>{PIECES.map(([label,code])=><option key={label} value={code}>{label}</option>)}</select></label><div className="buttonRow"><button onClick={placePiece}>♟ Đặt / thay quân</button><button onClick={clearBoard}>🧹 Xóa hết (FEN)</button><button onClick={resetBoard}>♟ Vị trí ban đầu</button></div><label>FEN của vị trí hiện tại<textarea rows="2" value={fenText} onChange={e=>setFenText(e.target.value)}/></label><div className="buttonRow"><button onClick={validateFen}>🔎 Kiểm tra FEN</button><button onClick={applyFen}>📋 Áp dụng FEN</button><button className="primary" onClick={startFromFen}>▶️ Xếp cờ → Chơi</button></div>{editorStatus&&<p>{editorStatus}</p>}</div>}</section>
  </div><aside><h2>Leaderboard</h2>{leader.map((p,i)=><div className="rank" key={p.id}><b>#{i+1}</b><span>{p.name}</span><strong>{p.elo}</strong></div>)}{!leader.length&&<p>Chưa có dữ liệu ELO hoặc Firebase chưa cấu hình.</p>}{user&&<><hr/><h3>Tài khoản</h3><p>{user.email}</p><small>ELO mặc định: 1200</small></>}</aside></section></main>;
}
export default App;
