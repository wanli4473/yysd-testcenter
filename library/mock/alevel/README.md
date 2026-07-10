# A-Level 真题库

三大考试局：**CAIE** · **Edexcel A Level** · **Oxford AQA A Level**

目录结构：

```
library/mock/alevel/
  caie/9709-mathematics/papers/
  edexcel/9ma0-mathematics/papers/
  oxford-aqa/7367-mathematics/papers/
```

PDF 命名：`{code}_{season}{yy}_{qp|ms}_{paper}.pdf`

- CAIE 示例：`9709_s24_qp_12.pdf`
- Edexcel 示例：`9MA0_s24_qp_01.pdf`
- Oxford AQA 示例：`7367_w23_ms_02.pdf`

```bash
python3 scripts/seed_alevel_demo.py      # 可选 demo
python3 scripts/build_alevel_catalog.py  # 更新 catalog
```

科目清单见 `scripts/alevel_subjects.py`。
