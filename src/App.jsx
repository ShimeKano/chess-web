import React, { useState } from 'react';
import { Chess } from 'chess.js';
import { analyse, bestMove, bestMoveDetailed } from './services/stockfish';
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

const OPENINGS = [
  { id: 'stockfish', label: 'Stockfish tự tính', moves: [] },
  { id: 'london', label: 'London System', moves: ['d4','d5','Bf4','Nf6','e3','c5','c3','Nc6','Nd2','e6','Ngf3','Bd6'] },
  { id: 'ruy-lopez', label: 'Ruy López', moves: ['e4','e5','Nf3','Nc6','Bb5','a6','Ba4','Nf6','O-O','Be7','Re1','b5','Bb3','d6'] },
  { id: 'italian', label: 'Italian Game', moves: ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3','Nf6','d3','d6'] },
  { id: 'queens-gambit', label: "Queen's Gambit", moves: ['d4','d5','c4','e6','Nc3','Nf6','Bg5','Be7','e3','O-O'] },
  { id: 'sicilian', label: 'Sicilian Defense', moves: ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6'] },
  { id: 'french', label: 'French Defense', moves: ['e4','e6','d4','d5','Nc3','Nf6'] },
  { id: 'caro-kann', label: 'Caro-Kann Defense', moves: ['e4','c6','d4','d5','Nc3','dxe4','Nxe4','Bf5','Ng3','Bg6'] },
  { id: 'reti', label: 'Réti Opening', moves: ['Nf3','d5','g3','Nf6','Bg2','e6','O-O','Be7'] }
];

function openingBookMove(game, openingId) {
  const opening = OPENINGS.find(item => item.id === openingId);
  if (!opening || opening.moves.length === 0) return null;
  try {
    const book = new Chess();
    const targetFen = game.fen();
    for (const san of opening.moves) {
      if (book.fen() === targetFen) {
        const move = book.move(san);
        return move ? move.from + move.to + (move.promotion || '') : null;
      }
      if (!book.move(san)) return null;
    }
  } catch {
    // A book line is optional; invalid/unavailable lines must never block Stockfish.
  }
  return null;
}


function gameToEditorPieces(game) {
  const pieces = {};
  for (let rank = 1; rank <= 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const square = FILES[file] + rank;
      const piece = game.get(square);
      if (piece) pieces[square] = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
    }
  }
  return pieces;
}

function placementToPieces(placement) {
  const ranks = placement.split('/');
  if (ranks.length !== 8) throw new Error('FEN cần có đúng 8 hàng.');
  const pieces = {};
  ranks.forEach((row, rowIndex) => {
    let file = 0;
    for (const ch of row) {
      if (/^[1-8]$/.test(ch)) {
        file += Number(ch);
      } else if (/^[prnbqkPRNBQK]$/.test(ch)) {
        if (file >= 8) throw new Error('Hàng FEN có quá 8 ô.');
        pieces[FILES[file] + (8 - rowIndex)] = ch;
        file++;
      } else {
        throw new Error('Ký tự không hợp lệ trong FEN: ' + ch);
      }
    }
    if (file !== 8) throw new Error('Mỗi hàng FEN phải có đúng 8 ô.');
  });
  return pieces;
}

function piecesToPlacement(pieces) {
  const rows = [];
  for (let rank = 8; rank >= 1; rank--) {
    let row = '', empty = 0;
    for (const file of FILES) {
      const piece = pieces[file + rank];
      if (!piece) { empty++; continue; }
      if (empty) { row += empty; empty = 0; }
      row += piece;
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join('/');
}

function fenWithPlacement(placement, sourceFen) {
  const fields = (sourceFen || '').trim().split(/\s+/);
  return [placement, fields[1] || 'w', fields[2] || '-', fields[3] || '-', fields[4] || '0', fields[5] || '1'].join(' ');
}

function Board({ game, selected, targets, flipped, editorMode, editorSquare, editorPieces, onSquare }) {
  const rows = flipped ? [0,1,2,3,4,5,6,7] : [7,6,5,4,3,2,1,0];
  const cols = flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  return <div className="boardWrap">
    <div className="rankLabels">{rows.map(r=><span key={r}>{r+1}</span>)}</div>
    <div className="boardColumn">
      <div className="board">{rows.flatMap(r=>cols.map(c=>{
        const sq=FILES[c]+(r+1), draftCode=editorMode?editorPieces[sq]:null, actualPiece=game.get(sq), piece=editorMode?(draftCode?{color:draftCode===draftCode.toUpperCase()?'w':'b',type:draftCode.toLowerCase()}:null):actualPiece, isLight=(r+c)%2===1;
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

function App(){
  const [game,setGame]=useState(()=>new Chess()),[selected,setSelected]=useState(null),[targets,setTargets]=useState([]),[status,setStatus]=useState('Chọn màu quân rồi bấm Ván mới.'),[best,setBest]=useState(''),[skill,setSkill]=useState(8),[humanColor,setHumanColor]=useState('w'),[flipped,setFlipped]=useState(false),[thinking,setThinking]=useState(false),[error,setError]=useState(''),[history,setHistory]=useState([new Chess().fen()]),[editorMode,setEditorMode]=useState(false),[editorSquare,setEditorSquare]=useState(null),[pieceChoice,setPieceChoice]=useState('wp'),[fenText,setFenText]=useState(new Chess().fen()),[editorStatus,setEditorStatus]=useState(''),[editorPieces,setEditorPieces]=useState(()=>gameToEditorPieces(new Chess())),[opening,setOpening]=useState('stockfish'),[showOpenings,setShowOpenings]=useState(false),[evalCp,setEvalCp]=useState(0),[evalMate,setEvalMate]=useState(null),[feedback,setFeedback]=useState(''),[autoWarn,setAutoWarn]=useState(true),[studyTab,setStudyTab]=useState('play'),[reviewInfo,setReviewInfo]=useState('');
  function resultStatus(g){if(g.isCheckmate())return 'Chiếu hết — '+(g.turn()==='w'?'Đen thắng!':'Trắng thắng!');if(g.isDraw())return 'Ván cờ hòa.';return g.isCheck()?'Chiếu!':'Lượt '+(g.turn()==='w'?'Trắng':'Đen');}
  function pushPosition(g){setGame(g);setFenText(g.fen());setHistory(h=>[...h,g.fen()]);setSelected(null);setTargets([]);setStatus(resultStatus(g));}
  async function runEngine(g,level=skill){if(g.isGameOver())return g;setThinking(true);setError('');setStatus('Stockfish đang suy nghĩ…');try{let uci=null;try{uci=openingBookMove(g,opening);}catch{uci=null;}if(uci){const check=new Chess(g.fen());const bookMove=check.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||'q'});if(!bookMove)uci=null;}let engineResult=null;if(!uci){engineResult=await bestMoveDetailed(g.fen(),level,1000);uci=engineResult?.move;}if(engineResult){if(Number.isFinite(engineResult.cp))setEvalCp(g.turn()==='w'?engineResult.cp:-engineResult.cp);setEvalMate(engineResult.mate??null);}if(!uci||uci==='(none)')throw new Error('Engine không trả về nước đi.');const next=new Chess(g.fen());const move=next.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||'q'});if(!move)throw new Error('Stockfish trả về nước đi không hợp lệ: '+uci);pushPosition(next);if(!engineResult){try{const scored=await bestMoveDetailed(next.fen(),20,500);if(Number.isFinite(scored.cp))setEvalCp(next.turn()==='w'?scored.cp:-scored.cp);setEvalMate(scored.mate??null);}catch{}}return next;}catch(e){setError('Stockfish chưa sẵn sàng: '+e.message);setStatus('Không thể lấy nước đi từ Stockfish.');return g;}finally{setThinking(false);}}
  async function newGame(){const g=new Chess();setGame(g);setHistory([g.fen()]);setSelected(null);setTargets([]);setEditorMode(false);setEditorSquare(null);setBest('');setError('');setFenText(g.fen());setFlipped(humanColor==='b');setStatus('Ván mới');if(humanColor==='b'){const after=await runEngine(g,skill);setHistory([after.fen()]);}else setStatus('Lượt Trắng — bạn đi trước.');}
  async function startFromFen(){try{const g=new Chess(fenText.trim());setGame(g);setHistory([g.fen()]);setSelected(null);setTargets([]);setEditorMode(false);setEditorSquare(null);setFlipped(humanColor==='b');setError('');setEditorStatus('Đã bắt đầu từ vị trí FEN.');setStatus(resultStatus(g));if(g.turn()!==humanColor&&!g.isGameOver()){const after=await runEngine(g,skill);setHistory([after.fen()]);}}catch(e){setEditorStatus('FEN không hợp lệ: '+e.message);}}
  async async function onSquare(sq){if(thinking)return;setError('');if(editorMode){
      if(!editorSquare){
        setEditorSquare(sq);
        setEditorStatus(editorPieces[sq]
          ? 'Đã chọn quân ở ô '+sq+'. Bấm ô đích để di chuyển quân.'
          : 'Đã chọn ô '+sq+'. Hãy chọn một ô đang có quân để di chuyển.');
        return;
      }
      if(editorSquare===sq){
        setEditorSquare(null);
        setEditorStatus('Đã bỏ chọn quân.');
        return;
      }
      const movingPiece = editorPieces[editorSquare];
      if(!movingPiece){
        setEditorSquare(editorPieces[sq] ? sq : null);
        setEditorStatus(editorPieces[sq]
          ? 'Đã chọn quân ở ô '+sq+'. Bấm ô đích để di chuyển quân.'
          : 'Ô '+sq+' đang trống. Hãy chọn một ô đang có quân.');
        return;
      }
      const next = {...editorPieces};
      delete next[editorSquare];
      if(editorPieces[sq]) {
        setEditorStatus('Đã di chuyển quân tới '+sq+' và thay quân ở ô đích.');
      } else {
        setEditorStatus('Đã di chuyển quân từ '+editorSquare+' tới '+sq+'.');
      }
      next[sq] = movingPiece;
      const fen = fenWithPlacement(piecesToPlacement(next), fenText || game.fen());
      setEditorPieces(next);
      setFenText(fen);
      setEditorSquare(null);
      try {
        const g = new Chess(fen);
        setGame(g);
        setHistory([g.fen()]);
        setStatus(resultStatus(g));
      } catch {
        setEditorStatus(prev => prev+' Vị trí chưa hợp lệ để chơi; bạn vẫn có thể tiếp tục chỉnh sửa.');
      }
      return;
    }if(game.isGameOver()){setStatus(resultStatus(game));return;}if(game.turn()!==humanColor)return;
    if(!selected){const p=game.get(sq);if(p&&p.color===humanColor){setSelected(sq);setTargets(game.moves({square:sq,verbose:true}).map(m=>m.to));}return;}
    if(selected===sq){setSelected(null);setTargets([]);return;}
    const own=game.get(sq);if(own&&own.color===humanColor){setSelected(sq);setTargets(game.moves({square:sq,verbose:true}).map(m=>m.to));return;}
    try{const beforeFen=game.fen();const g=new Chess(beforeFen);const m=g.move({from:selected,to:sq,promotion:'q'});if(!m){setSelected(null);setTargets([]);return;}setFeedback('');pushPosition(g);if(g.isGameOver()){return;}if(autoWarn){try{const beforeEval=await bestMoveDetailed(beforeFen,20,450);const afterEval=await bestMoveDetailed(g.fen(),20,450);const beforeWhite=Number.isFinite(beforeEval.cp)?(game.turn()==='w'?beforeEval.cp:-beforeEval.cp):0;const afterWhite=Number.isFinite(afterEval.cp)?(g.turn()==='w'?afterEval.cp:-afterEval.cp):beforeWhite;const loss=humanColor==='w'?beforeWhite-afterWhite:afterWhite-beforeWhite;if(loss>=100){const better=beforeEval.pv?.[0]||'';let betterSan='';if(better.length>=4){try{const tmp=new Chess(beforeFen);const bm=tmp.move({from:better.slice(0,2),to:better.slice(2,4),promotion:better[4]||'q'});betterSan=bm?.san||better;}catch{betterSan=better;}}setFeedback('Có thể là sai lầm: đánh giá xấu đi khoảng '+(loss/100).toFixed(1)+' tốt.'+(betterSan?' Nước nên cân nhắc: '+betterSan+'.':'')+' Sau khi đối thủ đi, hãy kiểm tra quân bị đe dọa và các nước chiếu/bắt quân.');}if(Number.isFinite(afterEval.cp))setEvalCp(g.turn()==='w'?afterEval.cp:-afterEval.cp);setEvalMate(afterEval.mate??null);}catch{setFeedback('Chưa phân tích được nước vừa đi; ván cờ vẫn tiếp tục bình thường.');}}await runEngine(g,skill);}catch{setSelected(null);setTargets([]);}
  }
  function undo(){if(thinking)return;if(history.length<2){setStatus('Chưa có nước đi để hoàn tác.');return;}const targetIndex=history.length>=3?history.length-3:history.length-2;const nextHistory=history.slice(0,targetIndex+1),g=new Chess(nextHistory[nextHistory.length-1]);setHistory(nextHistory);setGame(g);setFenText(g.fen());setSelected(null);setTargets([]);setError('');setStatus('Đã hoàn tác. '+resultStatus(g));}
  function analysePosition(){setBest('Đang phân tích…');analyse(game.fen(),12).then(uci=>{if(!uci||uci==='(none)'){setBest('Không có nước đi');return;}const g=new Chess(game.fen());const m=g.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]||'q'});setBest(m?m.san+' ('+uci+')':uci);}).catch(e=>setBest('Phân tích lỗi: '+e.message));}
  function downloadText(name, text, type='text/plain;charset=utf-8'){const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
  function exportPgn(){const pgn=game.pgn({maxWidth:100});downloadText('chess-web-game.pgn',pgn||'[Event "Chess Web"]\\n\\n*','application/x-chess-pgn;charset=utf-8');setReviewInfo('Đã xuất PGN.');}
  function exportStudyJson(){const moves=game.history({verbose:true}).map((m,i)=>({ply:i+1,color:m.color==='w'?'white':'black',from:m.from,to:m.to,san:m.san,lan:m.from+m.to+(m.promotion||''),captured:m.captured||null,promotion:m.promotion||null}));const data={format:'chess-web-study',version:1,savedAt:new Date().toISOString(),opening:OPENINGS.find(x=>x.id===opening)?.label||'Stockfish tự tính',startFen:new Chess().fen(),currentFen:game.fen(),pgn:game.pgn(),moves,latestEvaluation:{whiteCentipawns:evalCp,mate:evalMate},notes:feedback};downloadText('chess-web-study.json',JSON.stringify(data,null,2),'application/json;charset=utf-8');setReviewInfo('Đã xuất JSON kèm nước đi và ghi chú hiện tại.');}
  async function importGameFile(file){if(!file)return;try{const raw=await file.text();let g=new Chess();if(file.name.toLowerCase().endsWith('.json')){const data=JSON.parse(raw);if(data.pgn){g.loadPgn(data.pgn);}else if(data.currentFen){g=new Chess(data.currentFen);}else if(Array.isArray(data.moves)){for(const m of data.moves)g.move(m.san||{from:m.from,to:m.to,promotion:m.promotion||'q'});}else throw new Error('JSON không có PGN, FEN hoặc danh sách nước đi.');}else{g.loadPgn(raw);}setGame(g);setHistory([g.fen()]);setFenText(g.fen());setEditorPieces(gameToEditorPieces(g));setSelected(null);setTargets([]);setEditorMode(false);setFeedback('');setEvalCp(0);setEvalMate(null);setStatus('Đã nhập ván cờ — '+resultStatus(g));setReviewInfo('Đã nhập thành công. Bấm “Phân tích vị trí” để xem nước tốt nhất ở thế cờ hiện tại.');setStudyTab('review');}catch(e){setReviewInfo('Không nhập được tệp: '+e.message);}}
  function validateFen(){try{const g=new Chess(fenText.trim());setEditorStatus(g.isCheckmate()?'FEN hợp lệ — vị trí chiếu hết.':g.isDraw()?'FEN hợp lệ — vị trí hòa.':'FEN đọc được và hợp lệ.');}catch(e){setEditorStatus('FEN không hợp lệ: '+e.message);}}
  function applyFen(){try{const g=new Chess(fenText.trim());setGame(g);setEditorPieces(gameToEditorPieces(g));setHistory([g.fen()]);setSelected(null);setTargets([]);setEditorSquare(null);setEditorStatus('Đã áp dụng FEN lên bàn cờ.');setStatus(resultStatus(g));}catch(e){setEditorStatus('FEN không hợp lệ: '+e.message);}}
  function placePiece(){
    if(!editorMode){setEditorStatus('Hãy bật chế độ xếp cờ trước.');return;}
    if(!editorSquare){setEditorStatus('Hãy chọn một ô trên bàn cờ trước.');return;}
    const code = pieceChoice ? (pieceChoice[0] === 'w' ? pieceChoice[1].toUpperCase() : pieceChoice[1]) : '';
    const next = {...editorPieces};
    if(code) next[editorSquare] = code;
    else delete next[editorSquare];
    const fen = fenWithPlacement(piecesToPlacement(next), fenText || game.fen());
    setEditorPieces(next);
    setFenText(fen);
    try {
      const g = new Chess(fen);
      setGame(g);
      setHistory([g.fen()]);
      setStatus(resultStatus(g));
      setEditorStatus('Đã cập nhật ô '+editorSquare+'.');
    } catch {
      setEditorStatus('Đã cập nhật ô '+editorSquare+' trên bàn xếp quân. Vị trí chưa hợp lệ để chơi; tiếp tục chỉnh rồi bấm “Xếp cờ → Chơi”.');
    }
  }
  function clearBoard(){
    const next = {};
    setEditorPieces(next);
    setFenText(fenWithPlacement(piecesToPlacement(next), fenText || game.fen()));
    setEditorStatus('Đã xóa hết quân trên bàn xếp cờ. Hãy đặt đủ hai vua trước khi bắt đầu.');
  }
  function resetBoard(){
    const standard = new Chess();
    setEditorPieces(gameToEditorPieces(standard));
    setFenText(standard.fen());
    setEditorStatus('Đã khôi phục vị trí ban đầu trên bàn xếp cờ.');
  }
  return <main><header><div><h1>♟ Chess Web</h1><p>Chơi cờ vua với Stockfish chạy trực tiếp trên trình duyệt.</p></div></header>
  <nav className="studyTabs" aria-label="Chế độ"><button className={studyTab==='play'?'active':''} onClick={()=>setStudyTab('play')}>♟ Chơi cờ</button><button className={studyTab==='learn'?'active':''} onClick={()=>setStudyTab('learn')}>📘 Học khai cuộc</button><button className={studyTab==='review'?'active':''} onClick={()=>setStudyTab('review')}>🔎 Xem lại ván</button></nav>
  <section className="gameLayout"><div className="gamePanel"><div className="gameTop"><strong>{status}</strong><div className="topButtons"><button onClick={newGame} disabled={thinking}>🎮 Ván mới</button><button onClick={undo} disabled={thinking}>⏪ Đi lại</button></div></div>
  <div className="settingsRow"><label>Màu của bạn <select value={humanColor} onChange={e=>setHumanColor(e.target.value)}><option value="w">Trắng</option><option value="b">Đen</option></select></label><div className="openingControl"><button className="openingToggle" aria-expanded={showOpenings} onClick={()=>setShowOpenings(v=>!v)}>Khai cuộc: {OPENINGS.find(item=>item.id===opening)?.label || 'Stockfish tự tính'} <span aria-hidden="true">{showOpenings?'▴':'▾'}</span></button>{showOpenings&&<div className="openingMenu" role="group" aria-label="Chọn khai cuộc">{OPENINGS.map(item=><button key={item.id} className={opening===item.id?'openingOption active':'openingOption'} onClick={()=>{setOpening(item.id);setShowOpenings(false);setStatus(item.id==='stockfish'?'Chế độ Stockfish tự tính.':'Đã chọn '+item.label+' — chỉ theo sách khi vị trí phù hợp.');}}>{item.label}{opening===item.id?' ✓':''}</button>)}</div>}</div><label>Độ khó Stockfish: <b>{skill}/20</b><input type="range" min="0" max="20" value={skill} onChange={e=>setSkill(Number(e.target.value))}/></label><button onClick={()=>setFlipped(v=>!v)}>🔄 Lật bàn</button></div>
  <div className="evalAndBoard"><div className="evalBar" role="img" aria-label={'Đánh giá: '+(evalCp/100).toFixed(1)}><div className="evalBlack" style={{height:(100-Math.max(0,Math.min(100,50+evalCp/20)))+'%'}}></div><div className="evalWhite" style={{height:Math.max(0,Math.min(100,50+evalCp/20))+'%'}}></div><span className="evalLabel">{evalMate!==null?'M'+Math.abs(evalMate):(evalCp/100>0?'+':'')+(evalCp/100).toFixed(1)}</span></div><Board game={game} selected={selected} targets={targets} flipped={flipped} editorMode={editorMode} editorSquare={editorSquare} editorPieces={editorPieces} onSquare={onSquare}/></div>
  <div className="controls"><button onClick={analysePosition} disabled={thinking}>🧠 Phân tích vị trí</button><span>{best&&'Nước tốt nhất: '+best}</span></div>{error&&<p className="error">{error}</p>}{feedback&&<div className="moveFeedback" role="status"><strong>⚠️ Gợi ý sau nước đi</strong><p>{feedback}</p><button onClick={()=>setFeedback('')}>Đã hiểu</button></div>}<div className="trainingOptions"><label><input type="checkbox" checked={autoWarn} onChange={e=>setAutoWarn(e.target.checked)}/> Nhắc khi nước đi có thể là sai lầm</label><small>Phân tích nhanh tại chỗ; ngưỡng cảnh báo khoảng 1 tốt và có thể bỏ sót lỗi chiến thuật sâu.</small></div>
  <section className="studyPanel"><h2>{studyTab==='learn'?'Học khai cuộc':studyTab==='review'?'Lưu và xem lại ván':'Lưu bài học'}</h2>{studyTab==='learn'?<><p>Chọn khai cuộc ở thanh điều khiển phía trên rồi chơi thử. Khi đối thủ đi lệch biến mẫu, hãy dùng “Phân tích vị trí” để tìm nước phù hợp với thế cờ hiện tại.</p><div className="buttonRow"><button onClick={analysePosition} disabled={thinking}>Tìm nước tốt nhất</button><button onClick={()=>setFeedback('Kế hoạch cần đọc theo vị trí hiện tại: kiểm soát trung tâm, phát triển quân nhẹ, đưa vua an toàn và kiểm tra đòn chiến thuật trước mỗi nước.')}>Hiện checklist khai cuộc</button></div>{feedback&&<p>{feedback}</p>}</>:<><p>PGN lưu ván cờ tiêu chuẩn. JSON lưu thêm nước đi, khai cuộc đã chọn và ghi chú gần nhất.</p><div className="buttonRow"><button onClick={exportPgn}>⬇ Xuất PGN</button><button onClick={exportStudyJson}>⬇ Xuất JSON bài học</button><label className="fileImport">⬆ Nhập PGN / JSON<input type="file" accept=".pgn,.json,.txt" onChange={e=>{importGameFile(e.target.files?.[0]);e.target.value='';}}/></label><button onClick={analysePosition} disabled={thinking}>Phân tích vị trí hiện tại</button></div>{reviewInfo&&<p className="reviewInfo">{reviewInfo}</p>}</>}</section>
  <section className="editor"><button className="editorToggle" onClick={()=>{if(!editorMode){setEditorPieces(gameToEditorPieces(game));setFenText(game.fen());setEditorMode(true);setEditorSquare(null);setEditorStatus('Bật chế độ xếp cờ: bấm quân muốn di chuyển rồi bấm ô đích. Chọn quân trong danh sách để đặt mới.');}else{setEditorMode(false);setEditorSquare(null);setEditorStatus('Đã thoát chế độ xếp cờ.');}}}>{editorMode?'↩️ Thoát xếp cờ':'🛠️ Chế độ xếp cờ'}</button>
  {editorMode&&<div className="editorTools"><p>Di chuyển: bấm quân trên bàn cờ rồi bấm ô đích bất kỳ. Nếu ô đích có quân, quân đó sẽ bị thay thế. Muốn đặt quân mới, chọn ô rồi chọn quân bên dưới. Bạn cũng có thể sửa FEN trực tiếp.</p><label>Quân muốn đặt / thay<select value={pieceChoice} onChange={e=>setPieceChoice(e.target.value)}>{PIECES.map(([label,code])=><option key={label} value={code}>{label}</option>)}</select></label><div className="buttonRow"><button onClick={placePiece}>♟ Đặt / thay quân</button><button onClick={clearBoard}>🧹 Xóa hết (FEN)</button><button onClick={resetBoard}>♟ Vị trí ban đầu</button></div><label>FEN của vị trí hiện tại<textarea rows="2" value={fenText} onChange={e=>setFenText(e.target.value)}/></label><div className="buttonRow"><button onClick={validateFen}>🔎 Kiểm tra FEN</button><button onClick={applyFen}>📋 Áp dụng FEN</button><button className="primary" onClick={startFromFen}>▶️ Xếp cờ → Chơi</button></div>{editorStatus&&<p>{editorStatus}</p>}</div>}</section>
  </div></section></main>;
}
export default App;
