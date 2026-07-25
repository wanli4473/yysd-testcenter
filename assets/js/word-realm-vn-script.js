/* =========================================================================
   word-realm-vn-script.js — Phase 0+1 scripts (EN + ZH subtitles)
   ========================================================================= */
window.YYSD_WORD_REALM_VN_SCRIPT = {
  portraits: {
    hero: "assets/img/word-realm/hero.png",
    "hero-determined": "assets/img/word-realm/hero-determined.png",
    "hero-hurt": "assets/img/word-realm/hero-hurt.png",
    ella: "assets/img/word-realm/ella.png",
    "ella-smile": "assets/img/word-realm/ella-smile.png",
    "ella-worry": "assets/img/word-realm/ella-worry.png",
    "ella-fierce": "assets/img/word-realm/ella-fierce.png",
    prince: "assets/img/word-realm/hero.png",
    enemy: "assets/img/word-realm/enemy-fog-tongue.png",
    boss: "assets/img/word-realm/boss-fog-tongue.png",
    "map-mist": "assets/img/word-realm/map-mist.png",
    "map-stone": "assets/img/word-realm/map-stone.png",
    "map-ash": "assets/img/word-realm/map-ash.png",
    "map-throne": "assets/img/word-realm/map-throne.png",
    "cut-boss": "assets/img/word-realm/cut-mist-boss.png",
    "cut-clear": "assets/img/word-realm/cut-mist-clear.png",
    "cut-village": "assets/img/word-realm/cut-mist-village.png",
    "cut-road": "assets/img/word-realm/cut-mist-road.png",
    "cut-sky": "assets/img/word-realm/cut-mist-sky.png",
    "cut-shrine": "assets/img/word-realm/cut-mist-shrine.png",
    "cut-names": "assets/img/word-realm/cut-mist-names.png"
  },

  prologue: {
    id: "prologue",
    title: "Prologue · Before the Starlight",
    nodes: [
      {
        id: "p0", type: "line", speaker: "Narrator", portrait: "map-mist",
        en: "In the age before kingdoms learned their own names, there was Lex World — where every remembered word was a line of living law.",
        zh: "在王国学会呼唤自己名字之前，先有词之世界——每一个被记住的词，都是现实运行的一条律法。"
      },
      {
        id: "p1", type: "line", speaker: "Narrator", portrait: "map-mist",
        en: "Sky stayed blue only while someone still knew the word blue. Bridges held because weight still meant something.",
        zh: "天空因有人记得「蔚蓝」而保持蔚蓝；桥梁因「承重」仍有意义而咬合。"
      },
      {
        id: "p2", type: "line", speaker: "Narrator", portrait: "map-ash",
        en: "Then the Word-Eaters came. They did not swing swords. They made people forget.",
        zh: "然后噬词者来了。他们不动刀剑——他们让人遗忘。"
      },
      {
        id: "p3", type: "line", speaker: "Narrator", portrait: "map-ash",
        en: "Soldiers forgot passwords. Markets forgot fairness. The first city crumbled in silence — walls intact, the word home gone.",
        zh: "士兵忘了口令，市集忘了公平。第一座城在沉默中碎裂：墙还在，home 却没了。"
      },
      {
        id: "p4", type: "line", speaker: "Narrator", portrait: "map-throne",
        en: "People fought bravely — while they could still speak. Then courage itself began to vanish from their tongues.",
        zh: "人们曾英勇反抗——在还能说话的日子里。直到勇气一词，也从舌尖消失。"
      },
      {
        id: "p5", type: "cutscene",
        panels: [
          {
            art: "map-throne",
            en: "On the third night, Prince Lex stood alone in the Word Hospital, reading wounded words back into the page.",
            zh: "第三夜，王子莱克斯独自守在词医院，把伤损的词朗读回纸面。"
          },
          {
            art: "map-throne",
            en: "A nameless god answered: Memory Power is loaned only to those who remember for others.",
            zh: "无名神明回应：记忆之力，只借给愿意替别人记住的人。"
          },
          {
            art: "map-ash",
            en: "He trained. He rose. He burned his life to reclaim half a world of stolen words — and shattered into starlight.",
            zh: "他历练、崛起，燃尽生命夺回半个世界的词——然后碎成星屑。"
          }
        ]
      },
      {
        id: "p6", type: "line", speaker: "Ella", portrait: "ella",
        en: "Hey. Don't freeze. Starlight doesn't pick statues.",
        zh: "喂，别僵住。星屑可不会选一座雕像。"
      },
      {
        id: "p7", type: "line", speaker: "Ella", portrait: "ella",
        en: "I'm Ella — scribe of the old hospital. I kept the scraps. Tonight the scraps kept you.",
        zh: "我是艾拉，旧医院的书吏。我守着残页；今夜，残页守住了你。"
      },
      {
        id: "p8", type: "cutscene",
        panels: [
          {
            art: "hero",
            en: "Starlight settles on your shoulders. The second invasion has already begun — softer, crueler: doubt, delay, and the lie that remembering is worthless.",
            zh: "星屑落在你肩上。第二次进攻已经开始——更软，也更狠：怀疑、拖延，以及「记住毫无意义」的谎言。"
          },
          {
            art: "map-mist",
            en: "Mistvale waits. Fog-Tongues lick names off the stone. Your first quest is simple: remember, and strike.",
            zh: "晨雾平原在等待。雾舌正舔掉石碑上的名字。你的第一项任务很简单：记住，然后出剑。"
          }
        ]
      },
      {
        id: "p9", type: "choice", portrait: "ella",
        en: "Ella watches you. How do you answer the starlight?",
        zh: "艾拉看着你。你要如何回应星屑？",
        options: [
          { en: "I'll remember for others.", zh: "我愿意替别人记住。", flag: "vow_others", next: "p10a" },
          { en: "I'll get strong enough to win.", zh: "我会变得足够强，去赢下这一仗。", flag: "vow_strength", next: "p10b" }
        ]
      },
      {
        id: "p10a", type: "line", speaker: "Ella", portrait: "ella", next: "p11",
        en: "Good. That's the prince's condition. Don't forget it when the fog gets loud.",
        zh: "很好。那是王子的条件。雾太大的时候，别忘了。"
      },
      {
        id: "p10b", type: "line", speaker: "Ella", portrait: "ella", next: "p11",
        en: "Strength is fine — just aim it outward. Memory Power hates hoarders.",
        zh: "变强可以——但要把刀锋朝外。记忆之力讨厌囤积的人。"
      },
      {
        id: "p11", type: "line", speaker: "Ella", portrait: "ella", next: "end",
        en: "Open the map. Mistvale has eight shrine-lights. Clear them — and the Adult Fog-Tongue will wake.",
        zh: "打开地图。晨雾有八座祠灯。点亮它们——雾舌成体就会醒来。"
      },
      { id: "end", type: "end" }
    ]
  },

  mist_enter: {
    id: "mist_enter",
    title: "Chapter I · Mistvale",
    nodes: [
      {
        id: "e0", type: "cutscene",
        panels: [
          {
            art: "cut-road",
            en: "Mistvale was once a land of naming festivals. Lanterns sang the names of children into the dusk.",
            zh: "晨雾平原曾有命名的节日。灯笼把孩子们的名字唱进黄昏。"
          },
          {
            art: "cut-road",
            en: "Now the road-signs are licked blank. Fog curls where words used to stand.",
            zh: "如今路标被舔成空白。词曾经站立的地方，只剩卷曲的雾。"
          }
        ]
      },
      {
        id: "e1", type: "line", speaker: "Ella", portrait: "ella-worry",
        en: "Welcome to Mistvale — first wound of Lex World. Ordinary words dry up like dew.",
        zh: "欢迎来到晨雾平原——词境最先被撕裂的伤口。日常之词像露水，一忘就干。"
      },
      {
        id: "e2", type: "line", speaker: "Ella", portrait: "enemy",
        en: "Those curling shapes? Fog-Tongues. They lick names, hope, even the color of the sky.",
        zh: "那些卷曲的影子？雾舌。它们舔走名字、希望，甚至天空的颜色。"
      },
      {
        id: "e3", type: "line", speaker: "Ella", portrait: "ella-fierce",
        en: "Light the shrines one by one. Each true spelling is a sword-stroke. I'll mark every deed.",
        zh: "一座一座点亮祠庙。每一次正确的拼写都是一剑。我记下你的每一笔功业。"
      },
      {
        id: "e4", type: "line", speaker: "Narrator", portrait: "hero-determined", next: "end",
        en: "Three lights make a first legend. Eight lights wake the Adult. How far will your fire go tonight?",
        zh: "三盏灯，写成初传；八盏灯，唤醒成体。今夜你的火，能走多远？"
      },
      { id: "end", type: "end" }
    ]
  },

  mist_after_01: {
    id: "mist_after_01", title: "Mistvale · First Light",
    nodes: [
      {
        id: "a0", type: "cutscene",
        panels: [
          {
            art: "cut-shrine",
            en: "The first shrine answers. Golden runes climb the stone like waking veins.",
            zh: "第一座祠回应了。金色符文沿石面爬升，像苏醒的脉络。"
          }
        ]
      },
      { id: "a", type: "line", speaker: "Ella", portrait: "ella-smile",
        en: "First shrine lit. Feel that? The fog stepped back half a pace — for you.",
        zh: "第一座祠亮了。感觉到了吗？雾为你退了半步。" },
      { id: "b", type: "line", speaker: "Villager", portrait: "cut-village",
        en: "I… I remember my name again. It was almost gone. Thank you, traveler.",
        zh: "我……又想起自己的名字了。它差一点消失。谢谢你，旅人。" },
      { id: "c", type: "line", speaker: "Ella", portrait: "ella", next: "end",
        en: "Write that feeling down in your bones. This is what Memory Power is for.",
        zh: "把这种感觉写进骨头里。记忆之力，就是为这种瞬间存在的。" },
      { id: "end", type: "end" }
    ]
  },

  mist_after_02: {
    id: "mist_after_02", title: "Mistvale · Stone Letters",
    nodes: [
      { id: "a", type: "line", speaker: "Ella", portrait: "ella-smile",
        en: "The melted letters crawled back onto the stele. Ugly handwriting — but alive.",
        zh: "融化的字爬回碑面。字迹难看——但活着。" },
      { id: "b", type: "line", speaker: "Ella", portrait: "enemy",
        en: "Fog-Tongues hate letters that refuse to blur. Keep your blade sharp — every syllable a cut.",
        zh: "雾舌讨厌不肯模糊的字母。剑锋再利些——每个音节都是一斩。" },
      { id: "c", type: "line", speaker: "Hero", portrait: "hero-determined", next: "end",
        en: "(You tighten your grip. The mist flinches first.)",
        zh: "（你握紧掌心。雾，先退缩了。）" },
      { id: "end", type: "end" }
    ]
  },

  mist_after_03: {
    id: "mist_after_03", title: "Mistvale · Three Lights",
    nodes: [
      { id: "a", type: "line", speaker: "Ella", portrait: "ella-smile",
        en: "Three shrines lit. Not bad for a newborn host.",
        zh: "三座祠亮了。作为新宿主，还不赖。" },
      {
        id: "b", type: "cutscene",
        panels: [
          {
            art: "cut-village",
            en: "In a half-swallowed village, a child reaches for a name almost faded from stone.",
            zh: "半座村庄被雾吞着。孩子伸手去够石上快消失的名字。"
          },
          {
            art: "cut-shrine",
            en: "Your third light reaches them first. The name holds — trembling, then true.",
            zh: "你的第三盏灯先到了。名字稳住了：先是颤抖，然后真实。"
          }
        ]
      },
      { id: "c", type: "line", speaker: "Ella", portrait: "ella-worry", next: "end",
        en: "Rest if you need. The Adult still sleeps under the eighth stone — for now.",
        zh: "需要就休息。成体还睡在第八块石下——暂时如此。" },
      { id: "end", type: "end" }
    ]
  },

  mist_after_04: {
    id: "mist_after_04", title: "Mistvale · Nameless Beast",
    nodes: [
      { id: "a", type: "line", speaker: "Ella", portrait: "enemy",
        en: "That beast stopped spinning. It remembered what it was called — briefly.",
        zh: "那头兽不再打转了。它短暂想起了自己的名字。" },
      { id: "b", type: "line", speaker: "Ella", portrait: "ella",
        en: "Memory Power isn't only for humans. Even monsters want a name.",
        zh: "记忆之力不只给人。连怪物也想要一个名字。" },
      { id: "c", type: "line", speaker: "Ella", portrait: "ella-smile", next: "end",
        en: "If you can name a fear, you can cut it. Remember that when the Adult wakes.",
        zh: "能命名恐惧，就能斩断它。成体醒来时，记得这句话。" },
      { id: "end", type: "end" }
    ]
  },

  mist_after_05: {
    id: "mist_after_05", title: "Mistvale · Blue Returns",
    nodes: [
      {
        id: "a0", type: "cutscene",
        panels: [
          {
            art: "cut-sky",
            en: "A missing patch of sky stitches itself shut. Gold light writes the word blue back into heaven.",
            zh: "天空缺的那一块被缝合。金色的光，把 blue 写回天穹。"
          }
        ]
      },
      { id: "a", type: "line", speaker: "Narrator", portrait: "cut-sky",
        en: "Someone nearby whispers the word as if tasting rain for the first time.",
        zh: "有人轻声念出那个词，像第一次尝到雨水。" },
      { id: "b", type: "line", speaker: "Ella", portrait: "ella-smile", next: "end",
        en: "Color is a word too. Never let them tell you adjectives are useless.",
        zh: "颜色也是词。别信谁说形容词没用。" },
      { id: "end", type: "end" }
    ]
  },

  mist_after_06: {
    id: "mist_after_06", title: "Mistvale · Hope",
    nodes: [
      { id: "a", type: "line", speaker: "Child", portrait: "cut-village",
        en: "Hope… hope… I can say it again!",
        zh: "希望……希望……我又能说出来了！" },
      { id: "b", type: "line", speaker: "Ella", portrait: "ella-smile",
        en: "Smoke from the chimneys again. That's what a correct answer looks like on a map.",
        zh: "炊烟又起来了。正确答案在地图上，长这样。" },
      { id: "c", type: "line", speaker: "Ella", portrait: "ella-fierce", next: "end",
        en: "Two lights left before the ground starts knocking. Stay with me.",
        zh: "再两盏灯，地下就会敲门。跟紧我。" },
      { id: "end", type: "end" }
    ]
  },

  mist_after_07: {
    id: "mist_after_07", title: "Mistvale · Before the Boss",
    nodes: [
      {
        id: "a0", type: "cutscene",
        panels: [
          {
            art: "cut-boss",
            en: "Seven lights. The plain holds its breath. Something under the eighth stone rewrites foundation.",
            zh: "七盏灯。平原屏住呼吸。第八块石下，有东西在改写「根基」。"
          }
        ]
      },
      { id: "a", type: "line", speaker: "Ella", portrait: "ella-worry",
        en: "The Adult Fog-Tongue is waking. It will try to erase who you are — and who they are.",
        zh: "雾舌·成体在醒来。它会抹掉你是谁——以及他们是谁。" },
      { id: "b", type: "line", speaker: "Ella", portrait: "ella-fierce",
        en: "Check your title. Steady your breath. Then we go loud.",
        zh: "看清称号。稳住呼吸。然后，大声出剑。" },
      { id: "c", type: "line", speaker: "Hero", portrait: "hero-determined", next: "end",
        en: "(Starlight burns hotter. You step toward the last shrine.)",
        zh: "（星屑更烫。你走向最后一座祠。）" },
      { id: "end", type: "end" }
    ]
  },

  mist_boss_pre: {
    id: "mist_boss_pre",
    title: "Boss · Adult Fog-Tongue",
    nodes: [
      {
        id: "b0", type: "cutscene",
        panels: [
          {
            art: "cut-boss",
            en: "The mist wrings itself dry. Lamps die until only your shrine remains.",
            zh: "雾像被拧干的布。灯火熄灭，只剩你这一处祠光。"
          },
          {
            art: "boss",
            en: "From the fog rises a tongue large enough to lick a name off a city.",
            zh: "雾中升起一截舌头，大到能舔掉一座城的名字。"
          }
        ]
      },
      {
        id: "b1", type: "line", speaker: "Ella", portrait: "ella-fierce",
        en: "Don't look for me — look at its tongue. It's trying to erase who am I.",
        zh: "别找我——看它的舌头。它在抹掉 who am I。"
      },
      {
        id: "b2", type: "line", speaker: "Adult Fog-Tongue", portrait: "boss",
        en: "Forget… forget… you were never anyone…",
        zh: "忘了……忘了……你从来不是谁……"
      },
      {
        id: "b3", type: "choice", portrait: "hero-determined",
        en: "Your Memory Power flares. What do you declare?",
        zh: "记忆之力燃起。你要宣告什么？",
        options: [
          { en: "I remember my name!", zh: "我记得我的名字！", flag: "boss_name", next: "b4" },
          { en: "I remember theirs!", zh: "我记得他们的名字！", flag: "boss_others", next: "b4a" }
        ]
      },
      {
        id: "b4", type: "line", speaker: "Ella", portrait: "ella-fierce", next: "b5",
        en: "Good. Then prove it — every correct spelling is a slash across that tongue!",
        zh: "很好。那就证明——每一次正确拼写，都是斩向那截舌头的一剑！"
      },
      {
        id: "b4a", type: "line", speaker: "Ella", portrait: "ella-smile", next: "b5",
        en: "That's the prince's vow. Hold it when the fog screams loudest.",
        zh: "那是王子的誓言。雾最响的时候，抓住它。"
      },
      {
        id: "b5", type: "line", speaker: "Ella", portrait: "ella-fierce", next: "end",
        en: "Timed answers. Miss and it bites. Hit true — and cut.",
        zh: "限时作答。错过就挨咬。答对——就斩！"
      },
      { id: "end", type: "end" }
    ]
  },

  mist_boss_post: {
    id: "mist_boss_post",
    title: "Chapter I · Cleared",
    nodes: [
      {
        id: "c0", type: "cutscene",
        panels: [
          {
            art: "cut-boss",
            en: "The Adult Fog-Tongue tears into dew. Mistvale exhales for the first time in years.",
            zh: "雾舌·成体碎成露水。晨雾平原多年来第一次呼出一口气。"
          },
          {
            art: "cut-names",
            en: "Children shout their names across the plain. Lanterns answer like a second sunrise.",
            zh: "孩子们在平原上喊出自己的名字。灯笼回应，像第二轮日出。"
          },
          {
            art: "cut-clear",
            en: "Far east, empty stelae begin to open their eyes.",
            zh: "远东，空碑正在睁眼。"
          }
        ]
      },
      {
        id: "c1", type: "line", speaker: "Prince Lex (echo)", portrait: "prince",
        en: "Names are the shortest epics. You learned to fight. Next — remember for others.",
        zh: "名字是最短的史诗。你学会了战斗。下一步——替别人记得。"
      },
      {
        id: "c2", type: "line", speaker: "Ella", portrait: "ella-smile",
        en: "Chapter I — done. I'm writing it down before I cry. Don't look.",
        zh: "第一章——完。我先记下来，免得哭出来。别看我。"
      },
      {
        id: "c3", type: "line", speaker: "Ella", portrait: "map-stone", next: "end",
        en: "Glyph Gorge waits when you're ready. Definitions have been hollowed out — and something worse learned to yawn.",
        zh: "准备好就去石语峡谷。定义被挖空了——有更糟的东西学会了打哈欠。"
      },
      { id: "end", type: "end" }
    ]
  },

  /* Phase 1.5 — mid-chapter field events (non-battle) */
  mist_event_04: {
    id: "mist_event_04",
    title: "Mistvale · The Nameless Road",
    nodes: [
      {
        id: "m00", type: "cutscene",
        panels: [
          {
            art: "cut-road",
            en: "Halfway across Mistvale, the road forgets it is a road. Stones rearrange into a question.",
            zh: "雾原中途，路忘记了自己是路。石块排成一个问号。"
          }
        ]
      },
      {
        id: "m1", type: "line", speaker: "Lost Traveler", portrait: "cut-village",
        en: "Which way to the village? I… I forgot the word for left.",
        zh: "去村子哪边走？我……忘了「左」这个词。"
      },
      {
        id: "m2", type: "choice", portrait: "ella-worry",
        en: "Ella glances at you. How do you answer?",
        zh: "艾拉看你一眼。你怎么答？",
        options: [
          { en: "Point left. Say the word aloud.", zh: "指向左边，大声说出那个词。", flag: "mid_left", next: "m3a" },
          { en: "Walk with them until the word returns.", zh: "陪他们走，直到词回来。", flag: "mid_walk", next: "m3b" }
        ]
      },
      {
        id: "m3a", type: "line", speaker: "Ella", portrait: "ella-fierce", next: "m4",
        en: "Good. Speaking a word into the fog is half a sword-stroke.",
        zh: "很好。对着雾说出一个词，就已经是半剑。"
      },
      {
        id: "m3b", type: "line", speaker: "Ella", portrait: "ella-smile", next: "m4",
        en: "Patience is also Memory Power. The fog hates company.",
        zh: "耐心也是记忆之力。雾最讨厌有人陪。"
      },
      {
        id: "m4", type: "line", speaker: "Lost Traveler", portrait: "cut-village", next: "end",
        en: "Left… left! Thank you. The fourth shrine is ahead — it smells like fear.",
        zh: "左……左！谢谢。第四座祠在前头——闻起来像恐惧。"
      },
      { id: "end", type: "end" }
    ]
  },

  mist_event_06: {
    id: "mist_event_06",
    title: "Mistvale · Chimney Smoke",
    nodes: [
      {
        id: "n0", type: "cutscene",
        panels: [
          {
            art: "cut-village",
            en: "Smoke climbs again from three chimneys. A mother writes hope on a child's palm.",
            zh: "三缕炊烟又升起来。母亲在孩子掌心写下 hope。"
          },
          {
            art: "cut-sky",
            en: "Above them, a thin ribbon of blue refuses to fade.",
            zh: "在他们上方，一道细细的蓝，拒绝褪色。"
          }
        ]
      },
      {
        id: "n1", type: "line", speaker: "Ella", portrait: "ella-worry",
        en: "Six lights almost. The Adult under the eighth stone is dreaming louder.",
        zh: "快六盏灯了。第八块石下的成体，梦得更响。"
      },
      {
        id: "n2", type: "line", speaker: "Child", portrait: "cut-village",
        en: "Hero! When you win… will the sky stay blue?",
        zh: "勇者！你赢了以后……天空会一直是蓝色的吗？"
      },
      {
        id: "n3", type: "line", speaker: "Hero", portrait: "hero-determined", next: "end",
        en: "(You nod. The spark in your palm answers for you.)",
        zh: "（你点头。掌心的星屑替你回答。）"
      },
      { id: "end", type: "end" }
    ]
  },

  mist_revisit: {
    id: "mist_revisit",
    title: "Mistvale · After the Rain",
    nodes: [
      {
        id: "r0", type: "line", speaker: "Ella", portrait: "ella-smile",
        en: "You're back. Mistvale smells like wet stone and remembered names.",
        zh: "你回来了。晨雾闻起来像湿石头，还有被记起的名字。"
      },
      {
        id: "r1", type: "line", speaker: "Villager", portrait: "cut-names",
        en: "The Adult is gone. We keep a lamp on the eighth shrine for you.",
        zh: "成体没了。第八座祠我们给你留着一盏灯。"
      },
      {
        id: "r2", type: "line", speaker: "Ella", portrait: "map-stone", next: "end",
        en: "Revisit if you want. The real road is east — Glyph Gorge won't wait forever.",
        zh: "想回访就回访。真正的路在东边——石语峡谷不会永远等你。"
      },
      { id: "end", type: "end" }
    ]
  }
};

// Back-compat alias used by Phase 0 boot hook
window.YYSD_WORD_REALM_VN_SCRIPT.mist_clear3 = window.YYSD_WORD_REALM_VN_SCRIPT.mist_after_03;
