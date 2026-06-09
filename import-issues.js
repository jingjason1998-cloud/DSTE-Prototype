// 在浏览器控制台运行此脚本导入示例议题数据
(async () => {
  const res = await fetch('/sample-issues.json');
  const data = await res.json();
  
  // 导入 ST 议题
  localStorage.setItem('dste_issues_v1_ST', JSON.stringify(data.st));
  console.log('✅ ST 议题导入成功:', data.st.length, '条');
  
  // 导入 AT 议题
  localStorage.setItem('dste_issues_v1_AT', JSON.stringify(data.at));
  console.log('✅ AT 议题导入成功:', data.at.length, '条');
  
  // 触发页面刷新
  console.log('🔄 请刷新页面查看导入的议题');
})();
