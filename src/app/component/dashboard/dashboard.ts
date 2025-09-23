import {
  Component,
  OnInit,
  Inject,
  PLATFORM_ID,
  ElementRef,
  ViewChild,
  AfterViewInit,
  ChangeDetectorRef,
} from '@angular/core';
import { ElectionService } from '../../service/election.service';
import { SafePipe } from '../../pipes/safe.pipe';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import * as d3 from 'd3';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
  imports: [SafePipe, CommonModule, HttpClientModule],
})
export class Dashboard implements OnInit {
  svgContent: string = '';
  prevSvgContent = '';

  @ViewChild('svgContainer', { static: false }) svgContainer!: ElementRef;

  // private provinceCodeMap: { [province: string]: string } = {
  //   chiangrai: 'CRI',
  //   phayao: 'PYO',
  //   prachuapkhirikhan: 'PKN',
  //   trat: 'TRT',
  //   bangkok: 'BKK',
  // };

  private zoomBehavior!: d3.ZoomBehavior<Element, unknown>;

  constructor(
    private electionService: ElectionService,
    private http: HttpClient,
    private cd: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  // ngAfterViewChecked(): void {
  //   if (this.svgContent && this.svgContent !== this.prevSvgContent) {
  //     this.prevSvgContent = this.svgContent;
  //     // เรียก initializeZoom หลัง view เสร็จแบบไม่ทำให้ loop
  //     setTimeout(() => {
  //       this.initializeZoom();
  //     }, 0);
  //   }
  // }

  allElectionData: any = {};

  ngOnInit(): void {
    this.http.get('/assets/election-results.json').subscribe((data) => {
      this.allElectionData = data;
    });
    // const provinces = [
    //   'CRI', //เชียงราย
    //   'PYO', //พะเยา
    //   'PKN', //ประจวบ
    //   'TRT', //ตราด
    //   'BKK', //กรุงเทพ
    // ];

    // console.log('>>>', constResults);
    // let allWinners: { [id: string]: string } = {};
    // provinces.forEach((p, i) => {
    //   // const code = this.provinceCodeMap[p];
    //   const results = constResults[i];
    //   for (const c in results) {
    //     const constId = `${p}_${c}`;
    //     allWinners[constId] = results[c];
    //   }
    // });

    let allWinners: { [id: string]: string } = {};
    allWinners = {
      TRT_1: 'ก้าวไกล',
      RNG_1: 'ภูมิใจไทย',
      SKM_1: 'ก้าวไกล',
      SBR_1: 'พลังประชารัฐ',
      CNT_1: 'รวมไทยสร้างชาติ',
      CNT_2: 'ภูมิใจไทย',
      NYK_1: 'เพื่อไทย',
      NYK_2: 'เพื่อไทย',
      PNA_1: 'ภูมิใจไทย',
      PNA_2: 'พลังประชารัฐ',
      MDH_1: 'พลังประชารัฐ',
      MDH_2: 'ก้าวไกล',
      MSN_1: 'พลังประชารัฐ',
      MSN_2: 'ประชาธิปัตย์',
      LPN_1: 'ก้าวไกล',
      LPN_2: 'เพื่อไทย',
      STN_1: 'ภูมิใจไทย',
      STN_2: 'ภูมิใจไทย',
      ATG_1: 'ภูมิใจไทย',
      ATG_2: 'ภูมิใจไทย',
      ACR_1: 'ภูมิใจไทย',
      ACR_2: 'ภูมิใจไทย',
      UTI_1: 'ภูมิใจไทย',
      UTI_2: 'ภูมิใจไทย',
      KBI_1: 'ภูมิใจไทย',
      KBI_2: 'ภูมิใจไทย',
      KBI_3: 'ภูมิใจไทย',
      CTI_1: 'ก้าวไกล',
      CTI_2: 'ก้าวไกล',
      CTI_3: 'ก้าวไกล',
      CPN_1: 'รวมไทยสร้างชาติ',
      CPN_2: 'รวมไทยสร้างชาติ',
      CPN_3: 'รวมไทยสร้างชาติ',
      TAK_1: 'ก้าวไกล',
      TAK_2: 'ก้าวไกล',
      TAK_3: 'พลังประชารัฐ',
      NAN_1: 'เพื่อไทย',
      NAN_2: 'เพื่อไทย',
      NAN_3: 'เพื่อไทย',
      BKN_1: 'ภูมิใจไทย',
      BKN_2: 'ภูมิใจไทย',
      BKN_3: 'เพื่อไทย',
      PKN_1: 'ภูมิใจไทย',
      PKN_2: 'ประชาธิปัตย์',
      PKN_3: 'ประชาธิปัตย์',
      PRI_1: 'ภูมิใจไทย',
      PRI_2: 'ก้าวไกล',
      PRI_3: 'ก้าวไกล',
      PYO_1: 'พลังประชารัฐ',
      PYO_2: 'พลังประชารัฐ',
      PYO_3: 'พลังประชารัฐ',
      PLG_1: 'ประชาธิปัตย์',
      PLG_2: 'รวมไทยสร้างชาติ',
      PLG_3: 'ประชาธิปัตย์',
      PCT_1: 'ภูมิใจไทย',
      PCT_2: 'ภูมิใจไทย',
      PCT_3: 'ภูมิใจไทย',
      PBI_1: 'รวมไทยสร้างชาติ',
      PBI_2: 'ภูมิใจไทย',
      PBI_3: 'รวมไทยสร้างชาติ',
      PRE_1: 'เพื่อไทย',
      PRE_2: 'เพื่อไทย',
      PRE_3: 'เพื่อไทย',
      PKT_1: 'ก้าวไกล',
      PKT_2: 'ก้าวไกล',
      PKT_3: 'ก้าวไกล',
      YST_1: 'ไทยสร้างไทย',
      YST_2: 'เพื่อไทย',
      YST_3: 'ภูมิใจไทย',
      YLA_1: 'ประชาชาติ',
      YLA_2: 'ประชาชาติ',
      YLA_3: 'ประชาชาติ',
      SKN_1: 'ก้าวไกล',
      SKN_2: 'ก้าวไกล',
      SKN_3: 'ก้าวไกล',
      SKW_1: 'พลังประชารัฐ',
      SKW_2: 'พลังประชารัฐ',
      SKW_3: 'เพื่อไทย',
      NKI_1: 'พลังประชารัฐ',
      NKI_2: 'เพื่อไทย',
      NKI_3: 'เพื่อไทย',
      NBP_1: 'เพื่อไทย',
      NBP_2: 'เพื่อไทย',
      NBP_3: 'เพื่อไทย',
      UTT_1: 'เพื่อไทย',
      UTT_2: 'เพื่อไทย',
      UTT_3: 'เพื่อไทย',
      KPT_1: 'พลังประชารัฐ',
      KPT_2: 'พลังประชารัฐ',
      KPT_3: 'พลังประชารัฐ',
      KPT_4: 'พลังประชารัฐ',
      CCO_1: 'เพื่อไทย',
      CCO_2: 'พลังประชารัฐ',
      CCO_3: 'เพื่อไทย',
      CCO_4: 'ก้าวไกล',
      TRG_1: 'รวมไทยสร้างชาติ',
      TRG_2: 'พลังประชารัฐ',
      TRG_3: 'ประชาธิปัตย์',
      TRG_4: 'ประชาธิปัตย์',
      NPM_1: 'เพื่อไทย',
      NPM_2: 'เพื่อไทย',
      NPM_3: 'ภูมิใจไทย',
      NPM_4: 'ภูมิใจไทย',
      LPG_1: 'ก้าวไกล',
      LPG_2: 'เพื่อไทย',
      LPG_3: 'ก้าวไกล',
      LPG_4: 'ก้าวไกล',
      LEI_1: 'เพื่อไทย',
      LEI_2: 'เพื่อไทย',
      LEI_3: 'ภูมิใจไทย',
      LEI_4: 'เพื่อไทย',
      SRI_1: 'ก้าวไกล',
      SRI_2: 'เพื่อไทย',
      SRI_3: 'ภูมิใจไทย',
      SRI_4: 'พลังประชารัฐ',
      STI_1: 'เพื่อไทย',
      STI_2: 'เพื่อไทย',
      STI_3: 'เพื่อไทย',
      STI_4: 'เพื่อไทย',
      KRI_1: 'เพื่อไทย',
      KRI_2: 'เพื่อไทย',
      KRI_3: 'ภูมิใจไทย',
      KRI_4: 'เพื่อไทย',
      KRI_5: 'เพื่อไทย',
      NWT_1: 'รวมไทยสร้างชาติ',
      NWT_2: 'พลังประชารัฐ',
      NWT_3: 'พลังประชารัฐ',
      NWT_4: 'ภูมิใจไทย',
      NWT_5: 'ประชาชาติ',
      PTN_1: 'ประชาชาติ',
      PTN_2: 'พลังประชารัฐ',
      PTN_3: 'ประชาชาติ',
      PTN_4: 'ประชาธิปัตย์',
      PTN_5: 'ประชาชาติ',
      AYA_1: 'ก้าวไกล',
      AYA_2: 'ก้าวไกล',
      AYA_3: 'ภูมิใจไทย',
      AYA_4: 'ภูมิใจไทย',
      AYA_5: 'ภูมิใจไทย',
      PLK_1: 'ก้าวไกล',
      PLK_2: 'เพื่อไทย',
      PLK_3: 'รวมไทยสร้างชาติ',
      PLK_4: 'เพื่อไทย',
      PLK_5: 'ก้าวไกล',
      RYG_1: 'ก้าวไกล',
      RYG_2: 'ก้าวไกล',
      RYG_3: 'ก้าวไกล',
      RYG_4: 'ก้าวไกล',
      RYG_5: 'ก้าวไกล',
      RBR_1: 'รวมไทยสร้างชาติ',
      RBR_2: 'พลังประชารัฐ',
      RBR_3: 'พลังประชารัฐ',
      RBR_4: 'รวมไทยสร้างชาติ',
      RBR_5: 'พลังประชารัฐ',
      LRI_1: 'เพื่อไทย',
      LRI_2: 'ก้าวไกล',
      LRI_3: 'ภูมิใจไทย',
      LRI_4: 'ภูมิใจไทย',
      LRI_5: 'เพื่อไทย',
      SPB_1: 'ชาติไทยพัฒนา',
      SPB_2: 'ชาติไทยพัฒนา',
      SPB_3: 'ชาติไทยพัฒนา',
      SPB_4: 'ชาติไทยพัฒนา',
      SPB_5: 'ชาติไทยพัฒนา',
      KSN_1: 'เพื่อไทย',
      KSN_2: 'เพื่อไทย',
      KSN_3: 'พลังประชารัฐ',
      KSN_4: 'ภูมิใจไทย',
      KSN_5: 'เพื่อไทย',
      KSN_6: 'เพื่อไทย',
      NPT_1: 'ชาติไทยพัฒนา',
      NPT_2: 'รวมไทยสร้างชาติ',
      NPT_3: 'ชาติไทยพัฒนา',
      NPT_4: 'ก้าวไกล',
      NPT_5: 'ชาติไทยพัฒนา',
      NPT_6: 'ก้าวไกล',
      NSN_1: 'ก้าวไกล',
      NSN_2: 'เพื่อไทย',
      NSN_3: 'รวมไทยสร้างชาติ',
      NSN_4: 'ภูมิใจไทย',
      NSN_5: 'ภูมิใจไทย',
      NSN_6: 'ชาติพัฒนากล้า',
      PNB_1: 'พลังประชารัฐ',
      PNB_2: 'พลังประชารัฐ',
      PNB_3: 'พลังประชารัฐ',
      PNB_4: 'พลังประชารัฐ',
      PNB_5: 'พลังประชารัฐ',
      PNB_6: 'พลังประชารัฐ',
      MKM_1: 'เพื่อไทย',
      MKM_2: 'เพื่อไทย',
      MKM_3: 'ภูมิใจไทย',
      MKM_4: 'เพื่อไทย',
      MKM_5: 'เพื่อไทย',
      MKM_6: 'เพื่อไทย',
      CPM_1: 'เพื่อไทย',
      CPM_2: 'เพื่อไทย',
      CPM_3: 'ภูมิใจไทย',
      CPM_4: 'พลังประชารัฐ',
      CPM_5: 'เพื่อไทย',
      CPM_6: 'ภูมิใจไทย',
      CPM_7: 'พลังประชารัฐ',
      CRI_1: 'ก้าวไกล',
      CRI_2: 'เพื่อไทย',
      CRI_3: 'ก้าวไกล',
      CRI_4: 'เพื่อไทย',
      CRI_5: 'เพื่อไทย',
      CRI_6: 'ก้าวไกล',
      CRI_7: 'เพื่อไทย',
      PTE_1: 'ก้าวไกล',
      PTE_2: 'ก้าวไกล',
      PTE_3: 'ก้าวไกล',
      PTE_4: 'ก้าวไกล',
      PTE_5: 'เพื่อไทย',
      PTE_6: 'ก้าวไกล',
      PTE_7: 'ก้าวไกล',
      SNK_1: 'เพื่อไทย',
      SNK_2: 'ประชาธิปัตย์',
      SNK_3: 'เพื่อไทย',
      SNK_4: 'เพื่อไทย',
      SNK_5: 'พลังประชารัฐ',
      SNK_6: 'เพื่อไทย',
      SNK_7: 'เพื่อไทย',
      SNI_1: 'รวมไทยสร้างชาติ',
      SNI_2: 'รวมไทยสร้างชาติ',
      SNI_3: 'รวมไทยสร้างชาติ',
      SNI_4: 'รวมไทยสร้างชาติ',
      SNI_5: 'รวมไทยสร้างชาติ',
      SNI_6: 'ภูมิใจไทย',
      SNI_7: 'รวมไทยสร้างชาติ',
      NBI_1: 'ก้าวไกล',
      NBI_2: 'ก้าวไกล',
      NBI_3: 'ก้าวไกล',
      NBI_4: 'ก้าวไกล',
      NBI_5: 'ก้าวไกล',
      NBI_6: 'ก้าวไกล',
      NBI_7: 'ก้าวไกล',
      NBI_8: 'ก้าวไกล',
      RET_1: 'ชาติไทยพัฒนา',
      RET_2: 'เพื่อไทย',
      RET_3: 'พลังประชารัฐ',
      RET_4: 'เพื่อไทย',
      RET_5: 'เพื่อไทย',
      RET_6: 'เพื่อไทย',
      RET_7: 'ไทยสร้างไทย',
      RET_8: 'เพื่อไทย',
      SPK_1: 'ก้าวไกล',
      SPK_2: 'ก้าวไกล',
      SPK_3: 'ก้าวไกล',
      SPK_4: 'ก้าวไกล',
      SPK_5: 'ก้าวไกล',
      SPK_6: 'ก้าวไกล',
      SPK_7: 'ก้าวไกล',
      SPK_8: 'ก้าวไกล',
      SRN_1: 'ภูมิใจไทย',
      SRN_2: 'เพื่อไทย',
      SRN_3: 'ภูมิใจไทย',
      SRN_4: 'เพื่อไทย',
      SRN_5: 'เพื่อไทย',
      SRN_6: 'ภูมิใจไทย',
      SRN_7: 'ภูมิใจไทย',
      SRN_8: 'ภูมิใจไทย',
      SSK_1: 'เพื่อไทย',
      SSK_2: 'เพื่อไทย',
      SSK_3: 'ภูมิใจไทย',
      SSK_4: 'เพื่อไทย',
      SSK_5: 'เพื่อไทย',
      SSK_6: 'เพื่อไทย',
      SSK_7: 'เพื่อไทย',
      SSK_8: 'ภูมิใจไทย',
      SSK_9: 'เพื่อไทย',
      SKA_1: 'ประชาธิปัตย์',
      SKA_2: 'รวมไทยสร้างชาติ',
      SKA_3: 'ประชาธิปัตย์',
      SKA_4: 'พลังประชารัฐ',
      SKA_5: 'ประชาธิปัตย์',
      SKA_6: 'ประชาธิปัตย์',
      SKA_7: 'ภูมิใจไทย',
      SKA_8: 'ประชาธิปัตย์',
      SKA_9: 'ประชาธิปัตย์',
      CBI_1: 'ก้าวไกล',
      CBI_2: 'ก้าวไกล',
      CBI_3: 'ก้าวไกล',
      CBI_4: 'รวมไทยสร้างชาติ',
      CBI_5: 'เพื่อไทย',
      CBI_6: 'ก้าวไกล',
      CBI_7: 'ก้าวไกล',
      CBI_8: 'ก้าวไกล',
      CBI_9: 'ก้าวไกล',
      CBI_10: 'พลังประชารัฐ',
      CMI_1: 'ก้าวไกล',
      CMI_2: 'ก้าวไกล',
      CMI_3: 'ก้าวไกล',
      CMI_4: 'ก้าวไกล',
      CMI_5: 'เพื่อไทย',
      CMI_6: 'ก้าวไกล',
      CMI_7: 'ก้าวไกล',
      CMI_8: 'ก้าวไกล',
      CMI_9: 'พลังประชารัฐ',
      CMI_10: 'เพื่อไทย',
      NST_1: 'ประชาธิปัตย์',
      NST_2: 'ประชาธิปัตย์',
      NST_3: 'ประชาธิปัตย์',
      NST_4: 'ประชาธิปัตย์',
      NST_5: 'ประชาธิปัตย์',
      NST_6: 'พลังประชารัฐ',
      NST_7: 'ภูมิใจไทย',
      NST_8: 'ภูมิใจไทย',
      NST_9: 'ประชาธิปัตย์',
      NST_10: 'รวมไทยสร้างชาติ',
      BRM_1: 'ภูมิใจไทย',
      BRM_2: 'ภูมิใจไทย',
      BRM_3: 'ภูมิใจไทย',
      BRM_4: 'ภูมิใจไทย',
      BRM_5: 'ภูมิใจไทย',
      BRM_6: 'ภูมิใจไทย',
      BRM_7: 'ภูมิใจไทย',
      BRM_8: 'ภูมิใจไทย',
      BRM_9: 'ภูมิใจไทย',
      BRM_10: 'ภูมิใจไทย',
      UDN_1: 'ก้าวไกล',
      UDN_2: 'เพื่อไทย',
      UDN_3: 'ไทยสร้างไทย',
      UDN_4: 'เพื่อไทย',
      UDN_5: 'เพื่อไทย',
      UDN_6: 'ไทยสร้างไทย',
      UDN_7: 'เพื่อไทย',
      UDN_8: 'เพื่อไทย',
      UDN_9: 'เพื่อไทย',
      UDN_10: 'เพื่อไทย',
      KKN_1: 'ก้าวไกล',
      KKN_2: 'ก้าวไกล',
      KKN_3: 'ก้าวไกล',
      KKN_4: 'ภูมิใจไทย',
      KKN_5: 'เพื่อไทย',
      KKN_6: 'เพื่อไทย',
      KKN_7: 'เพื่อไทย',
      KKN_8: 'เพื่อไทย',
      KKN_9: 'เพื่อไทย',
      KKN_10: 'เพื่อไทย',
      KKN_11: 'ภูมิใจไทย',
      UBN_1: 'เพื่อไทย',
      UBN_2: 'ประชาธิปัตย์',
      UBN_3: 'เพื่อไทรวมพลัง',
      UBN_4: 'เพื่อไทย',
      UBN_5: 'ภูมิใจไทย',
      UBN_6: 'เพื่อไทย',
      UBN_7: 'เพื่อไทย',
      UBN_8: 'ภูมิใจไทย',
      UBN_9: 'ไทยสร้างไทย',
      UBN_10: 'เพื่อไทรวมพลัง',
      UBN_11: 'ภูมิใจไทย',
      NMA_1: 'ก้าวไกล',
      NMA_2: 'ก้าวไกล',
      NMA_3: 'ก้าวไกล',
      NMA_4: 'เพื่อไทย',
      NMA_5: 'เพื่อไทย',
      NMA_6: 'เพื่อไทย',
      NMA_7: 'เพื่อไทย',
      NMA_8: 'เพื่อไทย',
      NMA_9: 'ภูมิใจไทย',
      NMA_10: 'เพื่อไทย',
      NMA_11: 'เพื่อไทย',
      NMA_12: 'เพื่อไทย',
      NMA_13: 'เพื่อไทย',
      NMA_14: 'เพื่อไทย',
      NMA_15: 'เพื่อไทย',
      NMA_16: 'เพื่อไทย',
      BKK_1: 'ก้าวไกล',
      BKK_2: 'ก้าวไกล',
      BKK_3: 'ก้าวไกล',
      BKK_4: 'ก้าวไกล',
      BKK_5: 'ก้าวไกล',
      BKK_6: 'ก้าวไกล',
      BKK_7: 'ก้าวไกล',
      BKK_8: 'ก้าวไกล',
      BKK_9: 'ก้าวไกล',
      BKK_10: 'ก้าวไกล',
      BKK_11: 'ก้าวไกล',
      BKK_12: 'ก้าวไกล',
      BKK_13: 'ก้าวไกล',
      BKK_14: 'ก้าวไกล',
      BKK_15: 'ก้าวไกล',
      BKK_16: 'ก้าวไกล',
      BKK_17: 'ก้าวไกล',
      BKK_18: 'ก้าวไกล',
      BKK_19: 'ก้าวไกล',
      BKK_20: 'เพื่อไทย',
      BKK_21: 'ก้าวไกล',
      BKK_22: 'ก้าวไกล',
      BKK_23: 'ก้าวไกล',
      BKK_24: 'ก้าวไกล',
      BKK_25: 'ก้าวไกล',
      BKK_26: 'ก้าวไกล',
      BKK_27: 'ก้าวไกล',
      BKK_28: 'ก้าวไกล',
      BKK_29: 'ก้าวไกล',
      BKK_30: 'ก้าวไกล',
      BKK_31: 'ก้าวไกล',
      BKK_32: 'ก้าวไกล',
      BKK_33: 'ก้าวไกล',
    };

    this.http
      .get('/assets/thailand.svg', { responseType: 'text' })
      .subscribe((svgText) => {
        if (isPlatformBrowser(this.platformId)) {
          const parser = new DOMParser();
          const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
          const svg = svgDoc.documentElement;
          const hiddenDiv = document.createElement('div');
          hiddenDiv.style.display = 'none';
          document.body.appendChild(hiddenDiv);
          hiddenDiv.appendChild(svg);
          // Set stroke none for all paths to remove internal lines
          const paths = svg.querySelectorAll('path');
          paths.forEach((p) => {
            p.style.stroke = 'none';
          });
          for (const id in allWinners) {
            console.log(id);
            const g = svg.querySelector('#' + id);
            console.log(g);
            if (g) {
              const path = g.querySelector('path');
              const text = g.querySelector('tspan');
              if (path && text) {
                console.log(path.id);
                let styleStr = path.getAttribute('style') || '';
                let styleText = text.getAttribute('style') || '';
                styleText += ' fill: #FFFFFF !important;';
                styleStr = styleStr
                  .replace(/fill: *[^;]*;/g, '')
                  .replace(/stroke: *[^;]*;/g, '')
                  .replace(/stroke-width: *[^;]*;/g, '');
                styleStr +=
                  ' fill: ' + this.getColor(allWinners[id]) + ' !important;';
                path.setAttribute('style', styleStr);
                text.setAttribute('style', styleText);
              }
            }
          }
          this.svgContent = svg.outerHTML;
          hiddenDiv.remove();
          requestAnimationFrame(() => {
            this.initializeZoom();
          });
        } else {
          this.svgContent = svgText;
        }
      });
  }
  initializeZoom() {
    if (isPlatformBrowser(this.platformId)) {
      const svgEl = this.svgContainer.nativeElement.querySelector('svg');

      // ถ้า SVG ยังไม่ถูก render จริง ให้ return ทันที
      if (!svgEl) {
        console.warn('SVG ยังไม่มา รอ render ก่อน');
        return;
      }

      const svg = d3.select(svgEl);
      const zoom = d3
        .zoom<any, unknown>()
        .scaleExtent([1, 8])
        .on('zoom', (event: d3.D3ZoomEvent<any, any>) => {
          d3.select('#map_provinces').attr(
            'transform',
            event.transform.toString()
          );
        });

      svg.call(zoom);
      this.zoomBehavior = zoom;
    }
  }

  // ngAfterViewInit(): void {
  //   if (isPlatformBrowser(this.platformId)) {
  //     const svgEl = this.svgContainer.nativeElement.querySelector('svg');
  //     if (!svgEl) return; // ถ้า svg ยังไม่มา ให้รอ

  //     const svg = d3.select(svgEl);
  //     // const svg = d3.select(this.svgContainer.nativeElement).select('svg');

  //     const zoom = d3
  //       .zoom<any, unknown>()
  //       .on('zoom', (event: d3.D3ZoomEvent<any, any>) => {
  //         d3.select('#map_provinces').attr(
  //           'transform',
  //           event.transform.toString()
  //         );
  //       });
  //     svg.call(zoom);
  //     this.zoomBehavior = zoom;
  //   }
  // }

  zoomIn() {
    if (isPlatformBrowser(this.platformId) && this.zoomBehavior) {
      d3.select(this.svgContainer.nativeElement)
        .select('svg')
        .transition()
        .call(this.zoomBehavior.scaleBy as any, 1.5);
    }
  }

  zoomOut() {
    if (isPlatformBrowser(this.platformId) && this.zoomBehavior) {
      d3.select(this.svgContainer.nativeElement)
        .select('svg')
        .transition()
        .call(this.zoomBehavior.scaleBy as any, 0.5);
    }
  }

  private getColor(winner: string): string {
    if (winner.includes('ก้าวไกล')) return 'rgb(244, 117, 38)';
    if (winner.includes('เพื่อไทย')) return 'red';
    if (winner.includes('ภูมิใจไทย')) return 'rgb(12, 20, 156)';
    if (winner.includes('พลังประชารัฐ')) return 'rgb(31, 104, 221)';
    if (winner.includes('ประชาธิปัตย์')) return 'rgb(6, 175, 243)';
    if (winner.includes('รวมไทยสร้างชาติ')) return 'brown';
    if (winner.includes('ชาติไทยพัฒนา')) return '#FF5C77';
    if (winner.includes('ชาติพัฒนากล้า')) return '#004A87';
    if (winner.includes('ไทยสร้างไทย')) return '#1900FF';
    if (winner.includes('เพื่อไทรวมพลัง')) return '#96A9FF';
    if (winner.includes('ประชาชาติ')) return '#B87333';
    return 'gray';
  }

  onSvgClick(event: MouseEvent) {
    const target = event.target as SVGElement;
    if (target.tagName === 'path') {
      const parent = target.parentNode as SVGElement;
      if (
        parent &&
        parent.tagName === 'g' &&
        parent.id &&
        parent.id.includes('_')
      ) {
        const hexId = parent.id;
        alert(`คลิกเขต: ${hexId}`);
      } else {
        alert(`คลิกจังหวัด: ไม่ทราบ`);
      }
    }
  }

  tooltipVisible = false;
  tooltipText = '';
  tooltipSubText = '';
  tooltipImageUrl = '';
  tooltipX = 0;
  tooltipY = 0;

  onSvgHover(event: MouseEvent): void {
    const target = event.target as SVGElement;

    if (
      target instanceof SVGPathElement ||
      target instanceof SVGTextElement ||
      target instanceof SVGTSpanElement
    ) {
      let parent = target.parentElement;

      if (target instanceof SVGTSpanElement && parent?.tagName === 'text') {
        parent = parent.parentElement;
      }

      if (parent instanceof SVGGElement && parent.id.includes('_')) {
        console.log('>>>', parent.id);
        const zoneId = parent.id;
        const electionData = this.allElectionData;
        const [provinceCode, zoneNumber] = zoneId.split('_');

        // ตรวจสอบว่าข้อมูลมีครบก่อน
        if (
          electionData &&
          electionData[provinceCode] &&
          electionData[provinceCode][zoneNumber] &&
          electionData[provinceCode][zoneNumber].DISTRICT
        ) {
          const districtData = electionData[provinceCode][zoneNumber].DISTRICT;

          console.log('ข้อมูลทั้งหมดของ DISTRICT', districtData);

          // เข้าถึงแต่ละอันดับก็ได้ เช่น:
          const rank1 = districtData.rank1;

          // เอาไปแสดงใน tooltip ได้
          this.tooltipText = `${rank1.province} เขต${rank1.zone}`;
          this.tooltipSubText = `${rank1.name} <br> ${rank1.party_name} <br><h5> ${rank1.score}</h5>`;
          // this.tooltipImageUrl = `/assets/party-pic/${rank1.party_pic
          //   .split('/')
          //   .pop()}`;
          this.tooltipImageUrl = `/background/cat.png`;
        } else {
          this.tooltipText = 'ไม่พบข้อมูล';
          this.tooltipSubText = '';
          this.tooltipImageUrl = '/background/profile.png';
        }
      } else {
        this.tooltipText = 'จังหวัด: ไม่ทราบ';
        this.tooltipSubText = '';
        this.tooltipImageUrl = 'assets/images/default.jpg';
      }

      this.tooltipX = event.clientX + 10;
      this.tooltipY = event.clientY + 10;
      this.tooltipVisible = true;
    } else {
      this.tooltipVisible = false;
    }
  }

  hideTooltip() {
    this.tooltipVisible = false;
  }
}
