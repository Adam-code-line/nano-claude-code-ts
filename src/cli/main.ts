// cli的主入口

import { Command } from 'commander';
import { version } from '../package.json';

const program = new Command();

program.name('nano-claude').description('用于辅助编程的CLI工具').version(version);
