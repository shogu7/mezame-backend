const mysql = require('mysql2/promise');

const covers = {
  "66,666 Years: Advent of the Dark Mage": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861080/mezame/covers/cptzfpt4gqxw3feefpyv.jpg",
  "A Returner's Magic Should Be Special": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861082/mezame/covers/cc5d03aggflgntfryjfh.png",
  "A Stepmother’s Märchen": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861087/mezame/covers/j6ae6eqfjserv11y08n1.png",
  "After Ten Millennia in Hell": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861090/mezame/covers/ukfgcpmsxxjwlyjfuu4j.jpg",
  "BJ Alex": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861092/mezame/covers/sbmjpi0n0fchdnuoddum.jpg",
  "Bastard": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861094/mezame/covers/ampptjzt9p8te2oeojpu.jpg",
  "Beware the Villainess!": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861096/mezame/covers/q4mcrgj4a08lyle2ymxb.jpg",
  "Descended from Divinity": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861097/mezame/covers/kwp2uillnsun6gqlllwj.jpg",
  "Doctor Elise: The Royal Lady with the Lamp": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861099/mezame/covers/f1mkh64p6a2pgtxixs14.jpg",
  "Doom Breaker": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861102/mezame/covers/jj3s1gryfn4wdnc6lk8d.jpg",
  "Dungeon Reset": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861103/mezame/covers/hxrismfzuxkvgcygjf9r.png",
  "Eleceed": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861107/mezame/covers/mhatijtjdvjtnvyxcox8.jpg",
  "FFF-Class Trashero": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861108/mezame/covers/em12tn1pegaonkmmja8a.jpg",
  "Girls of the Wild's": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861110/mezame/covers/xstiuvwjynx9xqeqptds.jpg",
  "Her Summon": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861111/mezame/covers/w5jt3ktlmbdkwoz2uojr.jpg",
  "How to Use a Returner": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861112/mezame/covers/l4i9egxpyiv2irj0l6ra.jpg",
  "How to Win My Husband Over": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861114/mezame/covers/o1xmqjt7tulp82nejh3c.jpg",
  "I Am the Sorcerer King": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861116/mezame/covers/x4dgljmdm4qvqfdonhqd.jpg",
  "I Shall Master this Family!": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861117/mezame/covers/flmgejoixouqgl5xdopw.jpg",
  "I’m the Max-Level Newbie": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861119/mezame/covers/yr8datdjc3thyrxs2y5l.jpg",
  "Jungle Juice": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861121/mezame/covers/h4ibqydqittgkjsaachr.jpg",
  "Kill the Hero": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861123/mezame/covers/kmqe2h1zjwdittj6wgn2.png",
  "Killing Stalking": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861126/mezame/covers/qrtazku6eshlbtrigac5.jpg",
  "Latna Saga: Survival of a Sword King": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861129/mezame/covers/zw3tqm3agy39tbv81pva.jpg",
  "Level Up with the Gods": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861130/mezame/covers/jitaiwd2ctcxysz3mtyx.jpg",
  "Leviathan": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861131/mezame/covers/c2r5p4tvtbq86hn6rxop.png",
  "Log-in Murim": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861134/mezame/covers/rcwjfhfqpjjbey1lg94b.jpg",
  "Lookism": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861135/mezame/covers/aczbvjpoo7zra1yjejpw.jpg",
  "Lout of Count’s Family": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861136/mezame/covers/hyiiuic1yv6sgwhzgjg1.jpg",
  "Maybe Meant to Be": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861138/mezame/covers/nvtjjqvia1j7icd8ph36.jpg",
  "My Blasted Reincarnated Life": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861140/mezame/covers/sdwargi0wziapwotgmur.jpg",
  "My S-Class Hunters": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861141/mezame/covers/wlqb04uzy0wy4gxwcaje.jpg",
  "Mythic Item Obtained": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861143/mezame/covers/m0bbmcok3bedkyryzbnb.jpg",
  "Nano Machine": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861145/mezame/covers/jxtjmwmrbqfetwjwdf62.jpg",
  "Noblesse": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861147/mezame/covers/gniiubndkbftxrf1wpbz.jpg",
  "Omniscient Reader": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861149/mezame/covers/c00knhpjgex1vzenslif.jpg",
  "Overgeared": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861150/mezame/covers/st597kaigw9hxxuifqne.jpg",
  "Pick Me Up": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861154/mezame/covers/ylwew4qr8dbhpyx8uwix.png",
  "Positively Yours": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861159/mezame/covers/rjbc6mm6e4yxpsemgsli.jpg",
  "Return of the Blossoming Blade": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861161/mezame/covers/erpkgkz7hgk97osediu2.jpg",
  "Return of the Mad Demon": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861162/mezame/covers/pfpqmazuvqxrkbbreqo0.jpg",
  "Return to Player": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861164/mezame/covers/fcvcb1elebvroxjg78cl.jpg",
  "Revenge of the Baskerville Bloodhound": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861167/mezame/covers/y2bcovrbx1wjmwoukrvq.jpg",
  "Roxana": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861169/mezame/covers/mezm7mw271caeodg7ttt.jpg",
  "SSS-Class Revival Hunter": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861172/mezame/covers/wg8tmknuvcthdwf4tbnw.jpg",
  "Seasons of Blossom": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861174/mezame/covers/qwsf9p937fpyibxrhvbq.jpg",
  "Second Life Ranker": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861176/mezame/covers/whljtjzvpbhjbbmk83pm.jpg",
  "Shotgun Boy": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861178/mezame/covers/hoqolvzaiqstipwtxbls.jpg",
  "Solo Leveling": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861179/mezame/covers/nely9sgw86kdihjr9dhe.jpg",
  "Solo Leveling: Ragnarok": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861182/mezame/covers/vdaw1wbsljwnsca2esp1.jpg",
  "Sound of Magic": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861183/mezame/covers/jpzdsjsqbvuh8xwwxpph.jpg",
  "Study Group": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861186/mezame/covers/bysk4irrdvkbuod5nzmq.jpg",
  "Sweet Home": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861189/mezame/covers/iludwi5ixvd3ifyj7btq.jpg",
  "THE BREAKER - NEW WAVES": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861191/mezame/covers/zjr0mf60700m7czpgmf1.jpg",
  "THE BREAKER": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861192/mezame/covers/djysfjeiohcykbwlcdy5.jpg",
  "Teenage Mercenary": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861194/mezame/covers/fwiuhijqtsr1fcizuy3i.jpg",
  "The 100th Regression of the Max-Level Player": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861196/mezame/covers/bgbb6pvwl0cdpewnamrg.jpg",
  "The Academy's Genius Swordsman": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861199/mezame/covers/hjzfwbld8qhnxkdjmzh8.jpg",
  "The Academy's Undercover Professor": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861200/mezame/covers/l9nsw7bh18ywj79ohgrd.jpg",
  "The Advanced Player of the Tutorial Tower": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861202/mezame/covers/zsfqniorjufbczkuseuw.jpg",
  "The Archmage Returns After 4000 Years": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861203/mezame/covers/fg5u6m2tlafm6eyi4kwt.jpg",
  "The Art of Reincarnation": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861205/mezame/covers/yb7atokmutarcvutmnsk.jpg",
  "The Boxer": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861206/mezame/covers/zdz6epf7nn5m6alg9ped.png",
  "The Extra’s Academy Survival Guide": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861207/mezame/covers/wfjzwv7mjlfmucwmom8o.jpg",
  "The Frozen Player Returns": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861209/mezame/covers/lsjzhrohdcdfh66lbtgj.png",
  "The Gamer": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861212/mezame/covers/xkmztnxfldjpzzpeeel2.jpg",
  "The God of High School": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861214/mezame/covers/egjceymyajtcslzfxwz9.jpg",
  "The Greatest Estate Developer": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861215/mezame/covers/roechzdyoasrgl4xb8li.jpg",
  "The Horizon": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861216/mezame/covers/jlp5zuijbdwwquubs3nw.jpg",
  "The Infinite Mage": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861217/mezame/covers/y2yi4yejohsrq664ucqm.jpg",
  "The Lazy Lord Masters the Sword": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861218/mezame/covers/egdm5opk341r3eisnduk.jpg",
  "The Legend of the Northern Blade": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861222/mezame/covers/qubmthgcuezdiywtt0dq.jpg",
  "The Legendary Moonlight Sculptor": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861242/mezame/covers/et0psphvo4c9l9idfrks.jpg",
  "The Legendary Spearman Returns": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861244/mezame/covers/pwbfnvm4nyzqvdholqjk.png",
  "The Martial God Who Regressed Back to Level 2": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861248/mezame/covers/h843rtcqnfrusvvvsji6.png",
  "The Max Level Hero Strikes Back!": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861251/mezame/covers/ewqmuall4fqxhzqp59ti.jpg",
  "The Novel's Extra": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861253/mezame/covers/abk54hzcgahkyakvkypr.png",
  "The Player Who Can't Level Up": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861256/mezame/covers/haryfgiz4pyn1lruoeww.jpg",
  "The Reaper": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861257/mezame/covers/picklrmmzsthhf23qlbb.jpg",
  "The Reason Why Raeliana Ended Up at the Duke's Mansion": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861259/mezame/covers/vy8jsiq4bqumqbculqx4.jpg",
  "The Reborn Young Lord is an Assassin": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861261/mezame/covers/ydeyynhetwecpaig8ril.jpg",
  "The Remarried Empress": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861263/mezame/covers/btfjaciiujczlq4gawwl.png",
  "The Return of the 8th Class Mage": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861266/mezame/covers/vgjvmga92qeyzoj8vvwj.jpg",
  "The Second Coming of Gluttony": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861269/mezame/covers/kp9q1ivwvcazqqodm8sc.jpg",
  "The Twin Siblings' New Life": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861271/mezame/covers/kxmvx4fsriyrwojvczm3.jpg",
  "The Villainess Level 99": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861272/mezame/covers/f8vukgh4y5drh7x4ptsv.jpg",
  "Tower of God": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861275/mezame/covers/ojvypfo1spakcsymzuxo.jpg",
  "Unordinary": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861278/mezame/covers/wyytzofpgn7zfc9gpkik.jpg",
  "Versatile Mage": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861281/mezame/covers/tz2xtt9wosafmvgudgrm.jpg",
  "Villainess Level 99": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861284/mezame/covers/f8vukgh4y5drh7x4ptsv.jpg",
  "Who Made Me a Princess": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861286/mezame/covers/owyfrfggzyv5j0x8tdw3.jpg",
  "Worn and Torn Newbie": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861289/mezame/covers/pqlik6agpk1w2wlzzjji.jpg",
  "Your Throne": "https://res.cloudinary.com/degc8d4er/image/upload/v1764861292/mezame/covers/fpr2jzx4qqrdkx8y7bfg.jpg"
};

async function main() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'mezame_user',
    password: 'Natixis0607&*',
    database: 'mezame'
  });

  for (const [title, url] of Object.entries(covers)) {
    await connection.execute(
      'UPDATE manhwa SET cover_url = ? WHERE title = ?',
      [url, title]
    );
    console.log(`💾 Cover mise à jour pour "${title}"`);
  }

  await connection.end();
  console.log('🎉 Tous les covers ont été mis à jour !');
}

main().catch(err => {
  console.error('❌ Une erreur est survenue :', err);
});
