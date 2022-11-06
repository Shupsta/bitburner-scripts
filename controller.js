/** @param {NS} ns */
export async function main(ns) {

	var target = ns.args[0]
	var targetMaxMon = ns.getServerMaxMoney(target);
	var targetMinSec = ns.getServerMinSecurityLevel(target);

	var hackPids = new Array();

	var count = 0;
	while (count == 0) {

		//debugger;
		var securityDif = ns.getServerSecurityLevel(target) - (targetMinSec);
		ns.print("\nNeed to weaken target, security Diff:  " + securityDif);
		if (securityDif > 0) await WeakenTarget(securityDif);

		var growDif = (targetMaxMon) - ns.getServerMoneyAvailable(target);
		ns.print("\nNeed to grow target, grow Diff:  " + growDif);
		if (growDif > 0) {

			var growAmount = ns.getServerMoneyAvailable(target) / growDif;

			await GrowTarget(Math.round(growAmount));
		}

		ns.print("\nHacking target.");
		//ns.scp("hackV2.js", target, "home");

		var lastHackPID = hackPids[0];

		if (lastHackPID == 0 || lastHackPID == undefined) {
			hackPids[0] = ns.run("hackV2.js", 5, target);
		} else {
			while (ns.isRunning(hackPids[0])) {
				ns.print("\nWaiting for previous hack to finish");
				await ns.sleep(5000);
			}
			hackPids[0] = ns.run("hackV2.js", 5, target);
		}



	}

	async function WeakenTarget(securityDif) {

		//debugger;
		var securityScriptRam = 1.75;
		var securityScriptName = "weakenV2.js"

		var numThreads = 1;
		var decreaseAmount = ns.weakenAnalyze(numThreads, 1);

		while (decreaseAmount < securityDif) {
			numThreads++;
			decreaseAmount = ns.weakenAnalyze(numThreads, 1);
		}

		ns.print("\n" + numThreads + " are needed to reduce security.");
		var pids = FindRamAndLaunch(numThreads, securityScriptName, securityScriptRam);

		ns.print("\nNow to monitor PIDS for WeakenTarget.");

		await MonitorPIDS(pids);

	}

	async function GrowTarget(growDif) {

		//debugger;
		var growScriptRam = 1.75;
		var growScriptName = "growV2.js"

		var numThreads;
		if(growDif < 1) numThreads = 1;
		else numThreads = ns.growthAnalyze(target, growDif, 1);


		var pids = FindRamAndLaunch(numThreads, growScriptName, growScriptRam);

		ns.print("\nNow to monitor PIDS for GrowTarget.");

		await MonitorPIDS(pids);

	}



	function FindRamAndLaunch(neededThreads, script, scriptRam) {
		var connectedServers = ns.scan();
		ns.print("Number of servers found: " + connectedServers.length);

		var usedThreads = 0;
		var pids = new Array();

		for (var i = 0; i < connectedServers.length; i++) {

			//await ns.sleep(1);
			var server = connectedServers[i];

			if (!ns.hasRootAccess(server)) continue;

			var availableRam = GetAvailableRam(server);
			var availableThreads = availableRam / scriptRam;

			if (availableThreads < 1) {
				ns.print("\nSkipping server " + server + "with i: " + i);
				continue;
			}

			ns.scp(script, server, "home");

			var pid;
			pid = ns.exec(script, server, availableThreads, target);

			if (pid == 0) continue; //prob need to do something else
			pids.push(pid);

			usedThreads += availableThreads;


			ns.printf("\n%1$s had %2$d RAM available and used %3$d threads to launch %4$s", server, availableRam, availableThreads, script);
			if (usedThreads >= neededThreads) break;

		}
		return pids;
	}

	function GetAvailableRam(host) {
		return ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
	}

	async function MonitorPIDS(pids) {
		//debugger;
		if (pids.length == 0) return;
		for (var i = 0; i < pids.length; i++) {

			ns.print("\nMonitoring PID " + pids[i]);
			if (pids[i] == 0 || pids[i] == undefined) continue;
			if (ns.isRunning(pids[i])) {
				await ns.sleep(2000);
				i--;
			} else if (i != (pids.length - 1)) {
				continue;
			} else {
				ns.print("\n Done monitoring PIDS");
			}
		}
	}
}
