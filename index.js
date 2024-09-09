// Discord.js 및 기타 필수 모듈 가져오기
const { Client, Intents, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const config = require('./config.json');
const mysql = require('mysql2/promise');

// Discord 클라이언트 설정
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

// 클라이언트가 준비되었을 때 실행되는 코드
client.once('ready', () => {
  console.log(`${client.user.tag} 봇이 켜졌습니다!`);
});

// 버튼 생성
const row = new MessageActionRow().addComponents(
  new MessageButton()
    .setCustomId('request')
    .setLabel('신청하기')
    .setStyle('PRIMARY')
    .setEmoji('✨') // 여건 뭐 버튼 이모지 
);

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'request') {
    // 응답 지연
    await interaction.deferReply({ ephemeral: true });

    // MySQL 연결 설정
    let connection;
    try {
      connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'realworld',
      });

      // 사용자가 사전 예약되었는지 확인
      const [rows] = await connection.execute('SELECT * FROM bot_data WHERE discord_id=?;', [interaction.user.id]);

      if (rows.length === 0) {
        // DB에 사전 예약 정보 삽입
        await connection.query('INSERT INTO bot_data(discord_id) VALUES(?);', [interaction.user.id]);

        // 사전 예약에 참여한 인원 수 조회
        const [reservationCountRows] = await connection.execute('SELECT COUNT(*) AS count FROM bot_data;');
        const reservationCount = reservationCountRows[0].count;

        // 사전 예약 처리
        const embed = new MessageEmbed()
          .setTitle('TURN 사전 예약')
          .setDescription('사전 예약이 완료되었습니다.')
          .setColor('04c530');

        await interaction.editReply({ embeds: [embed], ephemeral: true });

        // 사용자에게 DM 전송
        const dmEmbed = new MessageEmbed()
          .setTitle('TURN 사전 예약')
          .setDescription(`**${reservationCount}**명과 함께하는 턴 서버 입니다.\n\n- 사전예약을 해주셔서 감사합니다.`)
          .setColor('BLUE');

        try {
          await interaction.user.send({ content: `@${interaction.user.tag}`, embeds: [dmEmbed] });
        } catch (error) {
          console.error('DM을 보내는 중 오류가 발생했습니다:', error);
        }

        // 사전 예약 로그 전송
        const user = await interaction.guild.members.fetch(interaction.user.id);
        const logEmbed = new MessageEmbed()
          .setTitle('사전 예약 로그')
          .setColor('20d407')
          .addFields(
            { name: '유저', value: `${interaction.user}`, inline: true },
            { name: '별명', value: `${user.nickname || interaction.user.username + ' (별명 없음)'}`, inline: true },
            { name: '사전 예약 참여', value: `${reservationCount}명이 사전 예약에 참여하였습니다.` }
          );

        const logChannel = client.channels.cache.get(''); // 사전예약 로그 채널 아이디 넣으시고
        if (logChannel) {
          logChannel.send({ embeds: [logEmbed] });
        } else {
          console.error('로그 채널을 찾을 수 없습니다.');
        }

        // 사전 예약 참여 인원 수 업데이트 메시지 수정
        const updateChannel = client.channels.cache.get(''); // 채널 갖다 넣어보면서 확인
        if (updateChannel) {
          const updateMessage = await updateChannel.messages.fetch(''); // 채널 갖다 넣어보면서 확인 
          const updateEmbed = new MessageEmbed()
            .setTitle('사전 예약')
            .setDescription("**아래의 버튼을 눌러 사전 예약에 참여하세요.**\n\n- 오픈 후 파이브엠과 디스코드 연동 후 지정된 비콘에서 보상이 지급됩니다.\n- 해당 지급 방법 외 지급 방법은 없다는 점 참고바랍니다.")
            .setColor('BLUE')
            .setFooter({ text: `${reservationCount}명이 테스트와 함께합니다 !`, iconURL: '아이콘 이미지링크 넣으시고' });

          await updateMessage.edit({ embeds: [updateEmbed] });
        } else {
          console.error('업데이트 채널을 찾을 수 없습니다.');
        }
      } else {
        // 이미 사전 예약된 사용자
        const embed = new MessageEmbed()
          .setTitle('TURN 사전 예약')
          .setDescription('이미 사전 예약에 등록된 상태입니다.')
          .setColor('RED');

        await interaction.editReply({ embeds: [embed], ephemeral: true });
      }
    } catch (error) {
      console.error(error);
      await interaction.editReply({ content: '사전 예약 처리 중 오류가 발생했습니다.', ephemeral: true });
    } finally {
      if (connection) await connection.end();
    }
  }
});

// 명령어 처리
client.on('messageCreate', async (message) => {
  if (message.content === '!사전예약') {
    // MySQL 연결 설정
    let connection;
    try {
      connection = await mysql.createConnection({
        host: '127.0.0.1',
        user: 'root',
        password: '',
        database: 'realworld', // 데베 리얼이면 vrpfx or realworld 엘슘이면 elysium 
      });

      // 사전 예약에 참여한 인원 수 조회
      const [reservationCountRows] = await connection.execute('SELECT COUNT(*) AS count FROM bot_data;');
      const reservationCount = reservationCountRows[0].count;

      const embed = new MessageEmbed()
        .setTitle('사전 예약')
        .setDescription("**아래의 버튼을 눌러 사전 예약에 참여하세요.**\n\n- 오픈 후 파이브엠과 디스코드 연동 후 지정된 비콘에서 보상이 지급됩니다.\n- 해당 지급 방법 외 지급 방법은 없다는 점 참고바랍니다.")
        .setColor('BLUE')
        .setFooter({ text: `${reservationCount}명이 테스트와 함께합니다 !`, iconURL: '아이콘 이미지링크 넣으시고' });

      await message.channel.send({ content: '@everyone', embeds: [embed], components: [row] });
      
      // 메시지 삭제
      await message.delete();
    } catch (error) {
      console.error(error);
      await message.channel.send('사전 예약 정보를 가져오는 중 오류가 발생했습니다.');
    } finally {
      if (connection) await connection.end();
    }
  }
});

// 클라이언트 로그인
client.login(config.token).catch(console.error);