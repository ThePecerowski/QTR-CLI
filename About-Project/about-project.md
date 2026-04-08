Bu proje hakkında;

Bu proje bir Node.js CLI eklentisidir. Bu eklenti  SpeakerQuaret için bir CLI eklentisi olacaktır. 

Ayır olarak geliştirecek ama qtr kütuphanesi ile uygulama ile bağlantılı çalışacaktır. 

CLI da her şey bir CLI komud kütuphanesi altında olacaktır (Şimdilik sonradan büyütülebilir.)

Bu kütuphanenin adı ise qtr dır (Quarter) 

qtr küttuphanesi şu komudlara ve işlemleri yapabilecek;

1. showd -- bütün cihazları tablo halinde gösterir. Cihaz bilgilerinde, adları, mac adressleri, ha
2. showl -- bütün cihazları listeler; listede cihazların sıra numarası ve adları gösterilir
3- band (cihaz sırası parametresi alır) -- cihaz sırasına göre engeller

4- unban (cihaz sırası parametresi alır) -- cihaz sırasına göre engeli kaldırır

5- stopengine -- motoru durdurur

6- startengine -- motoru başlatır

7- help -- bütün komudları gösterir ve ne işe yaradıklarını da yanına yazar. 

8- fix --  CLI ve Uygulama kurulumunda bir sorun olmadığınıa bakar

9- about -- CLI ve Uygulama hakkında genel bilgi ve yapımcı hakkında bilgi verir. 

10- updateA -- uygulamanı githuba bakıp en son sürümü indirip mevcut uygulamanın üstüne kurar

11- updateC -- CLI ın githubına bakıp en son sürümü indirip mevcut CLI ın üstüne kurar



Parametreler

1. --info -- o qtr komudunun ne işe yaradığını söyler
2. --help -- o komudun hata vermesi durumunda ne yapılabileceğini söyler
3. --stime (süre parametre si istenir) --  belirlenen süre sonra o komudu çalıştırır.

Özel parametreler

1. fix komuduna özel parametreler;
  1.1 --doctor -- windows da uygulamanın ve CLI nın çalışmasına engel bir şey varmı kontrol eder;
  1.2 --show -- mecvut sorunların nasıldüzeltilece ği hakkında bilgi verir

CLI hakkında diğer bilgiler;

Dil Node.js

Yapımcı hakkında bilgiler;

Ad; Recep Samet Yıldız
Web Site; https://www.yildizportfolio.com/yildizportfolio.com/public_html/Pages/index.html

Diğer projeler;

PsykoLink; https://psykolink.com/

github; https://github.com/ThePecerowski

