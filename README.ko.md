# Pedigree Workbench

[![GitHub Repo](https://img.shields.io/badge/GitHub-ReliOptic%2FPedigree__workbench-181717?logo=github)](https://github.com/ReliOptic/Pedigree_workbench)
![Desktop](https://img.shields.io/badge/Desktop-Tauri%202-24C8DB)
![Docs](https://img.shields.io/badge/Docs-English--first-1F6FEB)

[English](README.md) | [한국어](README.ko.md)

Pedigree Workbench는 혈통 및 계보 분석을 위한 오프라인 데스크톱 워크벤치입니다. 번식, 축산, 유전 연구 환경에서 관계를 시각적으로 검토하고, 구조화된 데이터를 빠르게 가져오며, 민감한 데이터를 로컬에 유지해야 할 때 적합합니다.

<p align="center">
  <img src="src-tauri/icons/icon.png" alt="Pedigree Workbench icon" width="120">
</p>

> 로컬 혈통 분석 환경  
> 번식 운영, 유전학 팀, 계보 중심 연구 워크플로에 적합

링크: [Repository](https://github.com/ReliOptic/Pedigree_workbench) · [Product Philosophy](PRODUCT_PHILOSOPHY.md) · [UX Roadmap](UX_ROADMAP.md) · [Changelog](CHANGELOG.md)

## 고객 가치

- 클라우드 플랫폼 없이 혈통 네트워크 시각화
- 인터랙티브 캔버스에서 직접 혈통 데이터 편집
- JSON, CSV, TSV 가져오기와 검증 보호장치 제공
- 시퀀스 데이터와 구조 분석 워크플로 결합

## 빠른 시작

브라우저 개발 모드:

```bash
npm install
npm run dev
```

검증:

```bash
npm run lint
npm run test
npm run build
```

데스크톱 패키징:

```bash
npm run tauri:build
```
