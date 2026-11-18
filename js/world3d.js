/* ============================================================================
   THREE.JS / WEBGL 3D OPEN-WORLD ENGINE (MATCHING PHOTO SCENE)
   ============================================================================ */
function startGame(){
  const scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0x9ec5e8,0.0011);

  const cam=new THREE.PerspectiveCamera(58,innerWidth/innerHeight,0.2,2400);
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  document.body.prepend(renderer.domElement);

  const composer = new THREE.EffectComposer(renderer);
  composer.addPass(new THREE.RenderPass(scene, cam));
  const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.25, 0.45, 0.88);
  composer.addPass(bloomPass);

  /* --- Procedural PBR Texture Helpers --- */
  const tx=(w,h,fn,rx=1,ry=1)=>{
    const c=document.createElement('canvas');c.width=w;c.height=h;
    fn(c.getContext('2d'),w,h);
    const t=new THREE.CanvasTexture(c);
    t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rx,ry);
    t.encoding=THREE.sRGBEncoding;t.anisotropy=8;
    return t;
  };
  const grain=(g,w,h,base,n,alpha=0.09)=>{
    g.fillStyle=base;g.fillRect(0,0,w,h);
    for(let i=0;i<n;i++){
      g.fillStyle=Math.random()<.5?`rgba(0,0,0,${alpha})`:`rgba(255,255,255,${alpha})`;
      g.fillRect(Math.random()*w,Math.random()*h,1+Math.random()*3,1+Math.random()*3);
    }
  };
  const P=(color,rough=.75,metal=.05,o={})=>new THREE.MeshStandardMaterial(Object.assign({color,roughness:rough,metalness:metal},o));
  const add=(g,m,x,y,z,cs=true,rs=true)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=cs;o.receiveShadow=rs;scene.add(o);return o;};

  /* --- Clear California Blue Sky & Sunlight --- */
  const skyGeo=new THREE.SphereGeometry(950,32,20);
  const skyMat=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:`varying vec3 p;void main(){p=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`varying vec3 p;void main(){float h=clamp(p.y*1.4+.05,0.,1.);vec3 col=mix(vec3(0.76,0.87,0.96),vec3(0.24,0.52,0.86),pow(h,0.55));gl_FragColor=vec4(col,1.);}`
  });
  scene.add(new THREE.Mesh(skyGeo,skyMat));

  scene.add(new THREE.HemisphereLight(0xdbeafe,0x78716c,0.72));
  const sun=new THREE.DirectionalLight(0xfff7ed,2.2);
  sun.position.set(120,210,140);
  sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  sun.shadow.bias=-0.0004;
  Object.assign(sun.shadow.camera,{left:-120,right:120,top:120,bottom:-120,near:1,far:600});
  scene.add(sun);

  /* --- Concrete Sidewalks, Weathered Asphalt Roads, Red Curb & Yellow Line --- */
  const concreteTex=tx(256,256,(g,w,h)=>{
    grain(g,w,h,'#a8a29e',5000,0.07);
    g.strokeStyle='rgba(60,55,50,0.25)';g.lineWidth=2;
    for(let i=0;i<=w;i+=64){g.beginPath();g.moveTo(i,0);g.lineTo(i,h);g.stroke();g.beginPath();g.moveTo(0,i);g.lineTo(w,i);g.stroke();}
  },180,180);
  add(new THREE.PlaneGeometry(2400,2400).rotateX(-Math.PI/2), P(0xffffff,0.9,0.02,{map:concreteTex}), 0,0,0, false, true);

  // Gritty Los Santos Asphalt Texture with Yellow Curb-Side Line & Cracks
  const roadTex=tx(256,512,(g,w,h)=>{
    grain(g,w,h,'#303236',14000,0.11);
    g.strokeStyle='rgba(15,15,18,0.45)';g.lineWidth=2;
    for(let i=0;i<18;i++){
      g.beginPath();let cx=Math.random()*w,cy=Math.random()*h;g.moveTo(cx,cy);
      for(let s=0;s<5;s++){cx+=(Math.random()-0.5)*30;cy+=Math.random()*35;g.lineTo(cx,cy);}
      g.stroke();
    }
    g.fillStyle='#eab308';
    g.fillRect(10,0,7,h);
    g.fillStyle='rgba(255,255,255,0.45)';
    for(let y=0;y<h;y+=96) g.fillRect(126,y+12,5,44);
  },1,1800/24);

  const roadMat=P(0xffffff,0.85,0.05,{map:roadTex,bumpMap:roadTex,bumpScale:0.35});
  RD.forEach((r,idx)=>{
    const L=r.hi-r.lo, m=(r.lo+r.hi)/2;
    const g=new THREE.PlaneGeometry(14,L).rotateX(-Math.PI/2);
    if(!r.v) g.rotateY(Math.PI/2);
    add(g, roadMat, r.v?r.c:m, 0.04+idx*0.002, r.v?m:r.c, false, true);
  });

  // Grassy Median Island & Red Painted Curb on the Left
  const grassTex=tx(256,256,(g,w,h)=>{
    grain(g,w,h,'#4d6b32',12000,0.14);
    g.fillStyle='rgba(120,145,65,0.25)';
    for(let i=0;i<800;i++) g.fillRect(Math.random()*w,Math.random()*h,2,7);
  },8,260);
  add(new THREE.BoxGeometry(9.2,0.28,1800), P(0xffffff,0.92,0,{map:grassTex}), -11.8, 0.14, 0, false, true);
  add(new THREE.BoxGeometry(0.45,0.32,1800), P(0xdc2626,0.55,0.05), -7.15, 0.16, 0, true, true);
  add(new THREE.BoxGeometry(0.5,0.26,1800), P(0x9ca3af,0.8), 7.25, 0.13, 0, false, true);

  // "No U-Turn" Road Sign on the Left Median
  {
    add(new THREE.CylinderGeometry(0.05,0.05,3.2,8), P(0x9ca3af,0.4,0.8), -8.2, 1.6, -16);
    const signTex=tx(128,128,(g,w,h)=>{
      g.fillStyle='#fff';g.fillRect(0,0,w,h);
      g.strokeStyle='#dc2626';g.lineWidth=14;g.beginPath();g.arc(64,64,46,0,7);g.stroke();
      g.strokeStyle='#111';g.lineWidth=10;g.beginPath();g.arc(64,66,20,Math.PI,0);g.lineTo(84,88);g.moveTo(44,66);g.lineTo(44,88);g.stroke();
      g.strokeStyle='#dc2626';g.lineWidth=12;g.beginPath();g.moveTo(30,30);g.lineTo(98,98);g.stroke();
    });
    const signMesh=new THREE.Mesh(new THREE.PlaneGeometry(0.95,0.95), new THREE.MeshBasicMaterial({map:signTex,side:THREE.DoubleSide}));
    signMesh.position.set(-8.2, 2.8, -16);
    scene.add(signMesh);
  }

  /* --- Tall California Palm Trees, Streetlamps & Wooden Utility Poles --- */
  const trunkMat=P(0x6b5344,0.95);
  const leafMat=P(0x3f6212,0.7,0.02,{side:THREE.DoubleSide});
  function addPalm(x,z,h=15){
    const g=new THREE.Group();
    const tr=new THREE.Mesh(new THREE.CylinderGeometry(0.18,0.32,h,8),trunkMat);
    tr.position.y=h/2; tr.castShadow=true; g.add(tr);
    for(let i=0;i<11;i++){
      const fg=new THREE.Group();
      fg.position.y=h;
      fg.rotation.y=(i/11)*Math.PI*2;
      fg.rotation.z=0.55+(i%2)*0.25;
      const leaf=new THREE.Mesh(new THREE.PlaneGeometry(0.85,3.8), leafMat);
      leaf.position.y=1.7; leaf.rotation.x=0.3; leaf.castShadow=true;
      fg.add(leaf); g.add(fg);
    }
    g.position.set(x,0,z); scene.add(g);
  }
  [-45,-75,-110,-190,-250,65,120].forEach(z=>addPalm(-33, z, 15+Math.abs(z%4)));

  function addStreetLamp(x,z){
    const g=new THREE.Group();
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.2,10.5,8), P(0x9ca3af,0.35,0.85));
    pole.position.y=5.25; pole.castShadow=true; g.add(pole);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(3.4,0.12,0.12), P(0x9ca3af,0.35,0.85));
    arm.position.set(1.5,10.3,0); g.add(arm);
    g.position.set(x,0,z); scene.add(g);
  }
  for(let z=-600; z<=300; z+=85) addStreetLamp(-8.2, z);

  function addUtilityPole(x,z){
    const g=new THREE.Group();
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.16,0.24,13.5,8), P(0x5c4033,0.95));
    pole.position.y=6.75; pole.castShadow=true; g.add(pole);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(2.4,0.14,0.14), P(0x5c4033,0.95));
    bar.position.set(0,12.2,0); g.add(bar);
    g.position.set(x,0,z); scene.add(g);
  }
  for(let z=-500; z<=250; z+=68) addUtilityPole(8.0, z);

  /* --- Iconic "CAR WASH" Complex on the Right --- */
  function buildCarWashLandmark(){
    const cw=new THREE.Group();
    cw.position.set(14, 0, -28);

    const beam=new THREE.Mesh(new THREE.BoxGeometry(0.55, 19.5, 0.55), P(0x9a3412,0.5,0.4));
    beam.position.set(-1.5, 9.75, 0); beam.castShadow=true; cw.add(beam);

    const topTex=tx(256,256,(g,w,h)=>{
      g.fillStyle='#fef3c7'; g.fillRect(0,0,w,h);
      g.strokeStyle='#78350f'; g.lineWidth=14; g.strokeRect(8,8,w-16,h-16);
      g.fillStyle='#b45309'; g.font='900 54px sans-serif'; g.textAlign='center';
      g.fillText('CAR', w/2, 95);
      g.fillStyle='#d97706'; g.font='900 68px sans-serif';
      g.fillText('WASH', w/2, 185);
    });
    const topBox=new THREE.Mesh(new THREE.BoxGeometry(5.6, 5.2, 0.8), new THREE.MeshStandardMaterial({map:topTex,roughness:0.35}));
    topBox.position.set(-1.5, 17.2, 0); topBox.castShadow=true; cw.add(topBox);

    const arrowMat=P(0xf59e0b,0.3,0.5,{emissive:0xd97706,emissiveIntensity:0.35});
    const vStem=new THREE.Mesh(new THREE.BoxGeometry(1.1, 4.6, 0.7), arrowMat);
    vStem.position.set(-2.5, 11.8, 0.2); cw.add(vStem);
    const hStem=new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.1, 0.7), arrowMat);
    hStem.position.set(-0.8, 9.8, 0.2); cw.add(hStem);
    const arrowTip=new THREE.Mesh(new THREE.ConeGeometry(1.3, 2.0, 3).rotateZ(-Math.PI/2), arrowMat);
    arrowTip.position.set(2.1, 9.8, 0.2); cw.add(arrowTip);

    const fasciaTex=tx(512,128,(g,w,h)=>{
      g.fillStyle='#ea580c'; g.fillRect(0,0,w,h);
      g.fillStyle='#fef08a'; g.font='900 62px sans-serif'; g.textAlign='center';
      g.fillText('CAR WASH', w/2, 84);
    });
    const fascia=new THREE.Mesh(new THREE.BoxGeometry(11, 2.2, 0.6), new THREE.MeshStandardMaterial({map:fasciaTex}));
    fascia.position.set(4.5, 6.2, -3); cw.add(fascia);

    const finMat=P(0xd97706,0.55,0.1);
    for(let i=0;i<9;i++){
      const fin=new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.2, 3.8), finMat);
      fin.position.set(-1.2, 8.2, -5 - i*3.6);
      fin.rotation.z = -0.22;
      fin.rotation.x = 0.12;
      fin.castShadow=true;
      cw.add(fin);
    }

    const tunnel=new THREE.Mesh(new THREE.BoxGeometry(14, 6.2, 34), P(0x27272a,0.8));
    tunnel.position.set(6.5, 3.1, -18); tunnel.castShadow=true; cw.add(tunnel);
    WB.push({x:20.5, z:-46, hx:7.5, hz:18});

    const blueBin=new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.3, 1.8), P(0x1d4ed8,0.4,0.3));
    blueBin.position.set(-2.6, 0.65, 2.2); blueBin.castShadow=true; cw.add(blueBin);

    scene.add(cw);
  }
  buildCarWashLandmark();

  /* --- Left-Side Industrial Buildings ("CITY PAINTS INC") & Brick Warehouse --- */
  function buildLeftStreetBuildings(){
    const cpTex=tx(512,256,(g,w,h)=>{
      grain(g,w,h,'#d6cfc2',4000,0.06);
      g.fillStyle='#9a3412'; g.font='900 38px sans-serif'; g.textAlign='center';
      g.fillText('CITY PAINTS INC', w/2, 165);
      g.fillStyle='#334155';
      for(let x=40;x<w-40;x+=75){ g.fillRect(x,35,45,65); g.fillRect(x,190,45,60); }
    });
    add(new THREE.BoxGeometry(18, 12.5, 42), P(0xffffff,0.8,{map:cpTex}), -42, 6.25, -45);
    WB.push({x:-42, z:-45, hx:9.5, hz:21.5});

    const brickTex=tx(256,256,(g,w,h)=>{
      grain(g,w,h,'#45271d',5000,0.12);
      g.fillStyle='#1e293b';
      for(let r=0;r<3;r++) for(let c=0;c<3;c++) g.fillRect(28+c*75, 30+r*75, 48, 45);
    });
    add(new THREE.BoxGeometry(16, 11.5, 26), P(0xffffff,0.85,{map:brickTex}), 18, 5.75, 2);
    WB.push({x:18, z:2, hx:8.5, hz:13.5});

    add(new THREE.BoxGeometry(28, 34, 24), P(0xe2e8f0,0.4,0.2), -24, 17, -230);
    add(new THREE.BoxGeometry(22, 46, 22), P(0xcbd5e1,0.3,0.4), 12, 23, -255);
  }
  buildLeftStreetBuildings();

  /* --- Procedural City Grid Blocks for Exploration --- */
  const blockCols=[0xd6cfc2, 0x9ca3af, 0x78716c, 0xcbd5e1, 0x57534e];
  for(let gx=-420; gx<=420; gx+=65){
    for(let gz=-420; gz<=420; gz+=65){
      if(Math.abs(gx) < 60 && Math.abs(gz) < 280) continue;
      const onRd = RD.some(r=>r.v ? Math.abs(gx-r.c)<22 : Math.abs(gz-r.c)<22);
      if(onRd) continue;
      const w=26+(Math.abs(gx*7+gz)%16), d=26+(Math.abs(gx+gz*11)%16), h=14+(Math.abs(gx*3+gz*5)%44);
      add(new THREE.BoxGeometry(w,h,d), P(blockCols[Math.abs(gx+gz)%blockCols.length],0.75), gx, h/2, gz);
      WB.push({x:gx,z:gz,hx:w/2+0.5,hz:d/2+0.5});
    }
  }

  /* ============================================================================
     SCULPTED WHITE SPORT SEDAN (BRAVADO BUFFALO / CHARGER STYLE)
     ============================================================================ */
  const rimMat=P(0xe2e8f0,0.2,0.92);
  const tireMat=P(0x18181b,0.88,0.05);
  const glassMat=new THREE.MeshPhysicalMaterial({color:0x0f172a,roughness:0.06,metalness:0.1,transmission:0.25,transparent:true,opacity:0.88,clearcoat:1});

  function createAlloyWheel(r=0.43,w=0.28){
    const wg=new THREE.Group();
    const tire=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,24).rotateZ(Math.PI/2),tireMat);
    tire.castShadow=true; wg.add(tire);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(r*0.68,r*0.68,w+0.02,18).rotateZ(Math.PI/2),rimMat);
    wg.add(rim);
    for(let i=0;i<7;i++){
      const sp=new THREE.Mesh(new THREE.BoxGeometry(w+0.03,r*1.25,0.045),P(0x334155,0.3,0.8));
      sp.rotation.x=(i/7)*Math.PI; wg.add(sp);
    }
    return wg;
  }

  function buildMuscleSedan(paintColor=0xf8fafc){
    const car=new THREE.Group();
    const bodyGrp=new THREE.Group();
    car.add(bodyGrp);

    const paintMat=new THREE.MeshPhysicalMaterial({
      color:paintColor, roughness:0.18, metalness:0.25, clearcoat:1.0, clearcoatRoughness:0.06
    });

    const lower=new THREE.Mesh(new THREE.BoxGeometry(2.08, 0.56, 4.95), paintMat);
    lower.position.y=0.54; lower.castShadow=true; bodyGrp.add(lower);

    const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.48, 2.55), glassMat);
    cabin.position.set(0, 1.02, -0.15); bodyGrp.add(cabin);
    const roof=new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.08, 1.75), paintMat);
    roof.position.set(0, 1.26, -0.18); roof.castShadow=true; bodyGrp.add(roof);

    const spoiler=new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.08, 0.22), paintMat);
    spoiler.position.set(0, 0.88, -2.42); bodyGrp.add(spoiler);

    const rearPanel=new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.26, 0.08), P(0x111113,0.3));
    rearPanel.position.set(0, 0.66, -2.47); bodyGrp.add(rearPanel);

    const tlMat=new THREE.MeshBasicMaterial({color:0xdc2626});
    const tailLightBar=new THREE.Mesh(new THREE.BoxGeometry(1.86, 0.14, 0.09), tlMat);
    tailLightBar.position.set(0, 0.67, -2.48); bodyGrp.add(tailLightBar);

    const plate=new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.20, 0.06), P(0xfefce8,0.4));
    plate.position.set(0, 0.44, -2.49); bodyGrp.add(plate);

    [-0.65,-0.48,0.48,0.65].forEach(ex=>{
      const tip=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.055,0.18,10).rotateX(Math.PI/2), P(0xe2e8f0,0.15,0.95));
      tip.position.set(ex, 0.27, -2.48); bodyGrp.add(tip);
    });

    [-1.05, 1.05].forEach(sx=>{
      const vent=new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.28, 0.45), P(0x111113,0.5));
      vent.position.set(sx, 0.58, 1.15); bodyGrp.add(vent);
      const mir=new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.11, 0.14), paintMat);
      mir.position.set(sx*1.04, 0.96, 0.68); bodyGrp.add(mir);
    });

    const grille=new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.26, 0.08), P(0x111113,0.4));
    grille.position.set(0, 0.54, 2.48); bodyGrp.add(grille);
    [-0.74,0.74].forEach(hx=>{
      const hl=new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.08), new THREE.MeshBasicMaterial({color:0xffffff}));
      hl.position.set(hx, 0.58, 2.48); bodyGrp.add(hl);
    });

    const wheels=[], pivots=[];
    [[-0.98,1.52],[0.98,1.52],[-0.98,-1.52],[0.98,-1.52]].forEach(([wx,wz],idx)=>{
      const piv=new THREE.Group();
      piv.position.set(wx, 0.43, wz);
      const wm=createAlloyWheel(0.43, 0.28);
      piv.add(wm); car.add(piv);
      wheels.push(wm);
      if(idx<2) pivots.push(piv);
    });

    return {root:car, body:bodyGrp, wheels, pivots, tlMat};
  }

  /* ============================================================================
     ARTICULATED PLAYER CHARACTER ("BURKE" GREEN JERSEY, BLACK SHORTS, BOOTS)
     ============================================================================ */
  function buildBurkeCharacter(){
    const g=new THREE.Group();
    const skin=P(0x8d5524, 0.62, 0.02);
    const shortMat=P(0x1c1917, 0.88, 0.02);
    const bootMat=P(0xc28538, 0.72, 0.05);
    const hairMat=P(0x14110f, 0.95);

    const jerseyTex=tx(256,256,(ctx,w,h)=>{
      ctx.fillStyle='#2e6f27'; ctx.fillRect(0,0,w,h);
      ctx.strokeStyle='#eab308'; ctx.lineWidth=10;
      ctx.strokeRect(4,4,w-8,h-8);
      ctx.fillStyle='#eab308'; ctx.font='900 34px sans-serif'; ctx.textAlign='center';
      ctx.fillText('BURKE', w*0.75, 92);
      ctx.fillText('BURKE', w*0.25, 92);
    });
    const jerseyMat=P(0xffffff, 0.82, 0.02, {map:jerseyTex});

    const hips=new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.24, 14), shortMat);
    hips.position.y=0.90; hips.castShadow=true; g.add(hips);

    const torso=new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.18, 0.56, 14), jerseyMat);
    torso.position.y=1.28; torso.castShadow=true; g.add(torso);

    const headGrp=new THREE.Group();
    headGrp.position.y=1.70;
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 14), skin);
    head.scale.set(0.92, 1.06, 0.96); head.castShadow=true; headGrp.add(head);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12, 0, Math.PI*2, 0, Math.PI*0.62), hairMat);
    hair.position.y=0.01; hair.rotation.x=-0.25; headGrp.add(hair);
    g.add(headGrp);

    const makeArm=(side)=>{
      const sh=new THREE.Group();
      sh.position.set(side*0.27, 1.50, 0);
      const up=new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.30, 12), skin);
      up.position.y=-0.15; up.castShadow=true; sh.add(up);
      const low=new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.044, 0.28, 12), skin);
      low.position.y=-0.42; low.castShadow=true; sh.add(low);
      g.add(sh); return sh;
    };
    const lArm=makeArm(-1), rArm=makeArm(1);

    const makeLeg=(side)=>{
      const hip=new THREE.Group();
      hip.position.set(side*0.11, 0.82, 0);
      const shortLeg=new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.11, 0.36, 12), shortMat);
      shortLeg.position.y=-0.16; shortLeg.castShadow=true; hip.add(shortLeg);
      const calf=new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.050, 0.36, 12), skin);
      calf.position.y=-0.50; calf.castShadow=true; hip.add(calf);
      const boot=new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.13, 0.25), bootMat);
      boot.position.set(0, -0.74, 0.04); boot.castShadow=true; hip.add(boot);
      g.add(hip); return hip;
    };
    const lLeg=makeLeg(-1), rLeg=makeLeg(1);

    return {
      root:g, torso, head:headGrp, lArm, rArm, lLeg, rLeg,
      animate(phase, speed){
        const amp=clamp(speed*0.16, 0, 0.75);
        lLeg.rotation.x=Math.sin(phase)*amp;
        rLeg.rotation.x=-Math.sin(phase)*amp;
        lArm.rotation.x=-Math.sin(phase)*amp*0.85;
        rArm.rotation.x=Math.sin(phase)*amp*0.85;
        torso.position.y=1.28+Math.abs(Math.cos(phase))*0.02*amp;
        headGrp.position.y=1.70+Math.abs(Math.cos(phase))*0.02*amp;
      }
    };
  }

  /* --- Initial Scene Staging --- */
  let playerCar = null, currentCarId = '';
  const carState = { x: 2.3, z: 1.5, h: Math.PI + 0.52, spd: 0, steer: 0 };
  const walkState = { x: -2.4, z: 8.5, h: Math.PI, phase: 0 };

  const playerHuman = buildBurkeCharacter();
  playerHuman.root.position.set(walkState.x, 0, walkState.z);
  playerHuman.root.rotation.y = walkState.h;
  scene.add(playerHuman.root);

  G.syncCar = () => {
    const wantId = (me && me.activeCar) || 'c1';
    if(wantId === currentCarId && playerCar) return;
    if(playerCar) scene.remove(playerCar.root);
    currentCarId = wantId;
    const cfg = CATALOG.cars.find(c=>c.id===wantId) || CATALOG.cars[0];
    playerCar = buildMuscleSedan(cfg.color);
    playerCar.cfg = cfg;
    playerCar.root.position.set(carState.x, 0, carState.z);
    playerCar.root.rotation.y = carState.h;
    scene.add(playerCar.root);
  };
  G.syncCar();

  /* --- AI Traffic Cars --- */
  const trafficCars = [];
  const aiCols = [0x1e293b, 0x991b1b, 0xd97706, 0xe2e8f0, 0x0f766e];
  for(let i=0; i<14; i++){
    const onLeftBlvd = i < 8;
    const laneX = onLeftBlvd ? (i%2===0 ? -27.5 : -20.5) : 3.5;
    const dir = onLeftBlvd ? (i%2===0 ? -1 : 1) : -1;
    const zPos = -320 + i*55;
    const cMesh = buildMuscleSedan(aiCols[i%aiCols.length]);
    cMesh.root.position.set(laneX, 0, zPos);
    cMesh.root.rotation.y = dir > 0 ? 0 : Math.PI;
    scene.add(cMesh.root);
    trafficCars.push({mesh:cMesh, x:laneX, z:zPos, dir, spd:14+Math.random()*6});
  }

  /* --- Controls, Enter/Exit Vehicle (E), Camera Orbit --- */
  const keys={};
  G.toggleMode = () => {
    if(G.mode === 'walk'){
      const dist = Math.hypot(walkState.x - carState.x, walkState.z - carState.z);
      if(dist > 14){
        carState.x = walkState.x + Math.cos(walkState.h)*2.8;
        carState.z = walkState.z - Math.sin(walkState.h)*2.8;
        carState.h = walkState.h;
        carState.spd = 0;
        toast('Mechanic delivered your car!');
      }
      G.mode = 'drive';
      playerHuman.root.visible = false;
      $('bMode').textContent = 'Exit Car (E)';
    } else {
      G.mode = 'walk';
      walkState.x = carState.x - Math.cos(carState.h)*2.2;
      walkState.z = carState.z + Math.sin(carState.h)*2.2;
      walkState.h = carState.h;
      playerHuman.root.visible = true;
      $('bMode').textContent = 'Enter Car (E)';
    }
  };
  $('bMode').onclick = G.toggleMode;

  addEventListener('keydown', e => {
    if(e.target.tagName==='INPUT') return;
    const k = e.key.toLowerCase();
    keys[k] = true;
    if(k === 'e') G.toggleMode();
    if(k === 'v') camMode = (camMode + 1) % 3;
  });
  addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

  document.querySelectorAll('#pad button').forEach(btn=>{
    const k=btn.dataset.k;
    const dn=e=>{e.preventDefault();keys[k]=true;};
    const up=e=>{e.preventDefault();keys[k]=false;};
    btn.addEventListener('pointerdown',dn);
    btn.addEventListener('pointerup',up);
    btn.addEventListener('pointerleave',up);
    btn.addEventListener('pointercancel',up);
  });

  let camYaw=0, camPitch=0.14, dragging=false, lastX=0, lastY=0, camMode=0;
  renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;});
  addEventListener('pointermove',e=>{
    if(!dragging) return;
    camYaw -= (e.clientX - lastX)*0.006;
    camPitch = clamp(camPitch + (e.clientY - lastY)*0.005, 0.04, 0.85);
    lastX=e.clientX; lastY=e.clientY;
  });
  addEventListener('pointerup',()=>{dragging=false;});

  addEventListener('resize',()=>{
    cam.aspect=innerWidth/innerHeight;
    cam.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
    composer.setSize(innerWidth,innerHeight);
  });

  /* ============================================================================
     MAIN SIMULATION & RENDER LOOP
     ============================================================================ */
  let prev=performance.now(), clockTick=0;

  function loop(now){
    requestAnimationFrame(loop);
    const dt = Math.min((now-prev)/1000, 0.05);
    prev = now;

    sun.castShadow = !!S.shadows;
    renderer.shadowMap.enabled = !!S.shadows;

    const fwd = (keys['w']||keys['arrowup']?1:0) - (keys['s']||keys['arrowdown']?1:0);
    const trn = (keys['a']||keys['arrowleft']?1:0) - (keys['d']||keys['arrowright']?1:0);
    const brk = keys[' '];

    if(G.mode === 'drive' && playerCar){
      const {maxSpd, accel, handle} = playerCar.cfg;
      const hpFactor = 0.45 + 0.55*(G.hp/100);

      if(fwd > 0) carState.spd += accel * hpFactor * dt;
      else if(fwd < 0) carState.spd -= (carState.spd > 1 ? accel*1.7 : accel*0.75) * dt;
      else carState.spd *= Math.pow(0.28, dt);

      if(brk) carState.spd *= Math.pow(0.04, dt);
      carState.spd = clamp(carState.spd, -maxSpd*0.38, maxSpd*hpFactor);

      const targetSteer = trn * 0.48;
      carState.steer += (targetSteer - carState.steer) * Math.min(1, dt*10);
      if(Math.abs(carState.spd) > 0.35){
        const rev = carState.spd >= 0 ? 1 : -1;
        carState.h += carState.steer * handle * rev * clamp(Math.abs(carState.spd)/14, 0.25, 1.1) * dt;
      }

      const nx = carState.x + Math.sin(carState.h) * carState.spd * dt;
      const nz = carState.z + Math.cos(carState.h) * carState.spd * dt;

      let hit = false;
      for(const b of WB){
        if(Math.abs(nx - b.x) < b.hx + 1.0 && Math.abs(nz - b.z) < b.hz + 2.2){ hit = true; break; }
      }
      if(hit){
        const impact = Math.abs(carState.spd);
        if(impact > 4){ G.hp = Math.max(5, G.hp - impact*0.65); crashSnd(impact); }
        carState.spd = -carState.spd * 0.35;
      } else {
        carState.x = nx; carState.z = nz;
      }

      // Auto-wash & repair when driving through Car Wash bay
      if(Math.hypot(carState.x - 13, carState.z - (-28)) < 6 && G.hp < 99){
        G.hp = Math.min(100, G.hp + dt*40);
        if(G.hp >= 99.5) toast('🚿 Car Wash: Vehicle cleaned & repaired!');
      }

      playerCar.root.position.set(carState.x, 0, carState.z);
      playerCar.root.rotation.y = carState.h;
      playerCar.pivots.forEach(p => p.rotation.y = carState.steer);
      playerCar.wheels.forEach(w => w.rotation.x += carState.spd * dt * 2.2);
      playerCar.tlMat.color.setHex((fwd < 0 || brk) ? 0xff2222 : 0x991111);

      PL.x = carState.x; PL.z = carState.z; PL.h = carState.h;
      $('speedo').style.display = 'block';
      $('speedo').innerHTML = `<span>${Math.round(Math.abs(carState.spd)*3.2)}</span> km/h`;
      $('dmg').style.display = 'block';
      const bar = $('dmg').querySelector('i');
      bar.style.width = G.hp + '%';
      bar.style.background = G.hp > 60 ? '#4ade80' : (G.hp > 30 ? '#facc15' : '#ef4444');

      if(A.ctx && A.on){
        const rpm = 48 + Math.abs(carState.spd)*3.4;
        A.e1.frequency.setTargetAtTime(rpm, A.ctx.currentTime, 0.05);
        A.e2.frequency.setTargetAtTime(rpm*1.5, A.ctx.currentTime, 0.05);
        A.eg.gain.setTargetAtTime(0.06 + Math.abs(carState.spd)*0.002, A.ctx.currentTime, 0.08);
      }
    } else {
      $('speedo').style.display = 'none';
      $('dmg').style.display = 'none';
      if(A.ctx && A.eg) A.eg.gain.setTargetAtTime(0, A.ctx.currentTime, 0.1);

      walkState.h += trn * 2.6 * dt;
      const moveSpd = fwd * 6.8;
      const nx = walkState.x + Math.sin(walkState.h) * moveSpd * dt;
      const nz = walkState.z + Math.cos(walkState.h) * moveSpd * dt;
      let blocked = false;
      for(const b of WB){
        if(Math.abs(nx - b.x) < b.hx + 0.5 && Math.abs(nz - b.z) < b.hz + 0.5){ blocked = true; break; }
      }
      if(!blocked){ walkState.x = nx; walkState.z = nz; }
      walkState.phase += Math.abs(moveSpd) * dt * 1.6;
      playerHuman.root.position.set(walkState.x, 0, walkState.z);
      playerHuman.root.rotation.y = walkState.h;
      playerHuman.animate(walkState.phase, Math.abs(moveSpd));

      PL.x = walkState.x; PL.z = walkState.z; PL.h = walkState.h;
    }

    // AI Traffic Update
    trafficCars.forEach(tc => {
      tc.mesh.root.visible = !!S.traffic;
      if(!S.traffic) return;
      const distPlayer = Math.hypot(tc.x - PL.x, tc.z - PL.z);
      const curSpd = distPlayer < 12 ? 0 : tc.spd;
      tc.z += tc.dir * curSpd * dt;
      if(tc.z > 400) tc.z = -400;
      if(tc.z < -400) tc.z = 400;
      tc.mesh.root.position.set(tc.x, 0, tc.z);
      tc.mesh.wheels.forEach(w => w.rotation.x += curSpd * dt * 2.1);
    });

    // Camera Follow
    if(!dragging && Math.abs(carState.spd) > 2 && G.mode==='drive') camYaw *= Math.pow(0.15, dt);
    const targetX = G.mode==='drive' ? carState.x : walkState.x;
    const targetZ = G.mode==='drive' ? carState.z : walkState.z;
    const targetH = G.mode==='drive' ? carState.h : walkState.h;

    if(camMode === 2 && G.mode==='drive'){
      cam.position.set(targetX + Math.sin(targetH)*0.4, 1.42, targetZ + Math.cos(targetH)*0.4);
      cam.lookAt(targetX + Math.sin(targetH)*25, 1.2, targetZ + Math.cos(targetH)*25);
    } else {
      const dist = G.mode==='drive' ? (camMode===1 ? 12.5 : 7.8) : 4.3;
      const totalYaw = targetH + camYaw;
      const rightOffset = G.mode==='walk' ? 0.55 : 0;
      const desiredX = targetX - Math.sin(totalYaw)*Math.cos(camPitch)*dist + Math.cos(totalYaw)*rightOffset;
      const desiredY = (G.mode==='drive'?1.35:1.55) + Math.sin(camPitch)*dist;
      const desiredZ = targetZ - Math.cos(totalYaw)*Math.cos(camPitch)*dist - Math.sin(totalYaw)*rightOffset;
      cam.position.lerp(new THREE.Vector3(desiredX, desiredY, desiredZ), Math.min(1, dt*12));
      cam.lookAt(targetX + Math.sin(totalYaw)*4, G.mode==='drive'?1.15:1.35, targetZ + Math.cos(totalYaw)*4);
    }

    clockTick += dt;
    if(clockTick > 0.25){
      clockTick = 0;
      const tStr = fmt(gameHour());
      $('clock').textContent = tStr;
      $('pClock').textContent = tStr;
      const wT = $('wT'); if(wT) wT.textContent = tStr;
      drawMinimap();
    }

    if(S.bloom) composer.render();
    else renderer.render(scene, cam);
  }

  requestAnimationFrame(loop);
}
