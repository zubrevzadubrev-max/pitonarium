let runtime;
self.onmessage = async ({data}) => {
  try {
    if (!runtime) {
      postMessage({type:'status',text:'Загружаем Python… Первый запуск может занять около минуты.'});
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.29.2/full/pyodide.js');
      runtime = await loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.29.2/full/'});
    }
    const lines = data.input.split('\n'); let cursor=0, output='', size=0;
    runtime.setStdin({stdin:()=>cursor<lines.length?lines[cursor++]:null});
    const append=s=>{size+=s.length;if(size>40000)throw Error('Слишком много вывода: сократи количество итераций.');output+=s+'\n';};
    runtime.setStdout({batched:append}); runtime.setStderr({batched:append});
    postMessage({type:'running'});
    const globals=runtime.toPy({});
    try {
      // During assessment, input prompts are UI text, not the program's answer.
      // Reading still goes through real Python input() and the configured stdin.
      if(data.check) runtime.runPython("import builtins as _lab_builtins\n_lab_original_input = _lab_builtins.input\n_lab_builtins.input = lambda prompt='': _lab_original_input()",{globals});
      await runtime.runPythonAsync(data.code,{globals});
      let checks=true;
      if(data.check) checks=!!runtime.runPython(data.check,{globals});
      postMessage({type:'done',output,checks});
    } finally {
      if(data.check) runtime.runPython('_lab_builtins.input = _lab_original_input',{globals});
      globals.destroy();
    }
  } catch(e) {postMessage({type:'error',text:e.message});}
};
