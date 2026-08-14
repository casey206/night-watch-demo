#!/bin/bash
# 《夜巡》概念影片組裝
set -euo pipefail
ROOT="/Users/casey/Documents/02. ING/寶城人壽_夜巡企劃"
cd "$ROOT"
rm -rf build && mkdir -p build && cd build

FF=(ffmpeg -hide_banner -loglevel error -nostdin -y)

card(){ # png dur out
  local png=$1 dur=$2 out=$3 fo
  fo=$(awk "BEGIN{printf \"%.2f\", $dur-0.6}")
  "${FF[@]}" -loop 1 -i "../cards/$png" \
    -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
    -t "$dur" \
    -vf "scale=1280:720,fade=in:st=0:d=0.5,fade=out:st=$fo:d=0.6,format=yuv420p" \
    -r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -ar 48000 -ac 2 -shortest "$out"
}

shot(){ # clip out
  local clip=$1 out=$2
  "${FF[@]}" -i "../clips/$clip" -t 8 \
    -vf "scale=1280:720,fade=in:st=0:d=0.5,fade=out:st=7.4:d=0.6,format=yuv420p" \
    -af "afade=in:st=0:d=0.5,afade=out:st=7.4:d=0.6" \
    -r 30 -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p \
    -c:a aac -b:a 128k -ar 48000 -ac 2 "$out"
}

card tc1.png 2.6 01.mp4      # 委任狀
shot s1_door.mp4     02.mp4  # 推開門
card tc2.png 2.4 03.mp4      # 零時
shot s2_midnight.mp4 04.mp4  # 十二點・空展櫃
card tc3.png 2.8 05.mp4      # 鎮館之寶不見了
shot s3_qianlong.mp4 06.mp4  # 乾隆・蓋不蓋章
card tc4.png 2.8 07.mp4      # 關卡
shot s4_warriors.mp4 08.mp4  # 兵馬俑內鬨
shot s5_puyi.mp4     09.mp4  # 溥儀
card tc5.png 2.4 10.mp4      # 六時
shot s6_dawn.mp4     11.mp4  # 白菜歸位
card tc6.png 3.6 12.mp4      # 品牌收尾

: > list.txt
for f in 01 02 03 04 05 06 07 08 09 10 11 12; do
  echo "file '$PWD/$f.mp4'" >> list.txt
done

"${FF[@]}" -f concat -safe 0 -i list.txt -c copy "../夜巡_概念影片_長版.mp4"
echo "BUILD_OK"
