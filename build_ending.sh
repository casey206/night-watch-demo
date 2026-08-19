#!/bin/bash
# 《夜巡》個人化結局影片 — 由 cards/end_a|b|c.png 組成
set -euo pipefail
ROOT="/Users/casey/Documents/02. ING/寶城人壽_夜巡企劃"
cd "$ROOT"
mkdir -p build_end && cd build_end
FF=(ffmpeg -hide_banner -loglevel error -nostdin -y)

# 緩慢推近（zoompan），輸出 1280x720 / 30fps
push(){ # png out dur zstart zend
  local png=$1 out=$2 dur=$3 z0=$4 z1=$5
  local n=$(awk "BEGIN{printf \"%d\", $dur*30}")
  local step=$(awk "BEGIN{printf \"%.6f\", ($z1-$z0)/$n}")
  "${FF[@]}" -loop 1 -i "../cards/$png" -t "$dur" \
    -vf "scale=2560:-1,zoompan=z='min($z0+on*$step,$z1)':d=$n:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps=30,format=yuv420p" \
    -r 30 -c:v libx264 -preset medium -crf 18 -an "$out"
}

push end_a.png a.mp4 4.5 1.000 1.055
push end_b.png b.mp4 5.5 1.055 1.095
push end_c.png c.mp4 3.5 1.000 1.020

# 交叉溶接：a→b（銘牌自然浮現）、b→c（落款）
"${FF[@]}" -i a.mp4 -i b.mp4 -i c.mp4 -filter_complex \
"[0:v][1:v]xfade=transition=fade:duration=0.9:offset=3.6[ab];\
 [ab][2:v]xfade=transition=fade:duration=0.7:offset=8.4[v];\
 [v]fade=in:st=0:d=0.8,fade=out:st=11.3:d=0.9[vo]" \
 -map "[vo]" -r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p v_only.mp4

DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 v_only.mp4)

# 音軌：沿用黎明鏡頭的鐘聲與環境音
AFO=$(awk -v d="$DUR" 'BEGIN{printf "%.2f", d-1.2}')
"${FF[@]}" -i ../clips/s6_dawn.mp4 -vn -t "$DUR" \
  -af "afade=in:st=0:d=1.0,afade=out:st=${AFO}:d=1.2,volume=0.9" \
  -c:a aac -b:a 128k -ar 48000 -ac 2 aud.m4a

"${FF[@]}" -i v_only.mp4 -i aud.m4a -c:v copy -c:a copy -shortest \
  "../夜巡_結局影片_館長版.mp4"

echo "ENDING_OK  $(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "../夜巡_結局影片_館長版.mp4")s"
