// Supply the local preview URL to existing suites that do not start their own server.
const {fs,path,root,browserServer}=require('./support.cjs');
const {spawn}=require('node:child_process');
(async()=>{
 const service=await browserServer();let failed=false;
 try{
  const directory=path.join(root,'tmp/qa/v4');fs.mkdirSync(directory,{recursive:true});
  for(const name of process.argv.slice(2)){
   if(!/^[a-z0-9-]+$/.test(name))throw Error('Invalid suite name');
   const result=await new Promise(resolve=>{
    const child=spawn(process.execPath,[path.join(root,'tests/qa',name+'.cjs')],{cwd:root,env:{...process.env,QA_BASE_URL:service.base}});let output='';
    child.stdout.on('data',d=>output+=d);child.stderr.on('data',d=>output+=d);child.on('close',code=>resolve({code,output}));
   });
   fs.writeFileSync(path.join(directory,name+'.log'),result.output);
   console.log((result.code===0?'PASS ':'FAIL ')+name+' '+result.output.slice(-1300));if(result.code!==0)failed=true;
  }
 }finally{await service.close();}
 if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
