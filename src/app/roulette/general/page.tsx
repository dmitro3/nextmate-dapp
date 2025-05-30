'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '@/store/store';
import { withAuth } from '@/app/_components/withAuth/withAuth';
import { fetchBalance } from '@/lib/balanceApi';
import MainMenu from '@/app/_components/MainMenu/MainMenu';
import RouletteHistoryDrawer from '@/app/_components/RouletteHistoryDrawer/RouletteHistoryDrawer';
import { LuckyWheel } from 'lucky-canvas';
import fetchAPI from '@/lib/api';
import WithdrawDrawer from '@/app/_components/WithdrawDrawer/WithdrawDrawer';
import { LoaderCircle } from 'lucide-react';
import RouletteResultDrawer from '@/app/_components/RouletteResultDrawer/RouletteResultDrawer';
import PreloadImages from '@/app/_components/PreloadImages/PreloadImags';
import { useLotteryPrizes } from '@/hooks/useLotteryPrizes';
import { useUserBalance } from '@/hooks/useBalance';
import { useUserInfo } from '@/hooks/useUserInfo';
import Link from 'next/link';
import { useToastContext } from '@/app/_components/ToastModal/ToastContext';
import { usePreloadImage } from '@/hooks/usePreloadImage';
import { useRouterLoadingContext } from '@/app/_components/RouterLoading/RouterLoading';
import RouletteTab from '../tab/page';

const RoulettePage: React.FC = () => {
	const router = useRouter();
	const [images, setImages] = useState([
		'/img/roulette/bg-gift.png',
		'/img/bg-spin.png',
		'/img/icon/light.svg',
	]);
	const account = useSelector((state: RootState) => state.accountInfo.account);
	const [isActive, setIsActive] = useState(false);
	const [isOpen, setIsOpenHistory] = useState(false);
	const [isOpenResult, setIsOpenResult] = useState(false);
	const [history, setHistory] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [isFree, setIsFree] = useState(false);
	const [isSpinEnd, setIsSpinEnd] = useState(false);
	const [freeDrawCount, setFreeDrawCount] = useState(0);
	const [isRendered, setIsRendered] = useState(false);
	const [luckyLottery, setLuckyLottery] = useState(null);
	const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
	const { roulette, poolId } = useLotteryPrizes('Nextmate');
	const { data: balance, reload: reloadBalance } = useUserBalance();
	const { user, isLoading: isLoadingUser, reload: reloadUser } = useUserInfo();
	const { showToast } = useToastContext();
	const { isLoadingImage, preloadImages } = usePreloadImage(images);
	const { showRouterLoading } = useRouterLoadingContext();

	useEffect(() => {
		if (balance && balance.gold >= 500) {
			setIsActive(true);
		} else {
			setIsActive(false);
		}
	}, [balance]);

	useEffect(() => {
		if (user) {
			setFreeDrawCount(user.freeDrawCount);
			setIsFree(user.freeDrawCount > 0);
		}
	}, [user]);

	// 获取历史记录
	const fetchHistory = async () => {
		try {
			const res = await fetchAPI(`/api/lottery/records`, {
				method: 'GET',
				params: {
					poolId,
				},
			});
			if (res.success === true) {
				setHistory(res.data);
			}
		} catch (error) {
			console.log('error...', error);
		}
	};

	const handleStartDraw = () => {
		if (user?.dailyDrawCountExceeded) {
			showToast(
				'Spin your heart out, max 100 spins a day. Come back tomorrow for more spins.',
				'error',
				'bottom',
				false,
			);
			return;
		}
		if (isLoading) return;
		if (!isRendered) return;
		if (!isFree && !isActive) return;
		setIsSpinEnd(false);
		luckyLottery?.play();
		handleDraw();
		// setResult(roulette[3]);
		// luckyLottery.stop(3);
	};
	// 抽奖
	const handleDraw = async () => {
		setIsLoading(true);
		try {
			const res = await fetchAPI('/api/lottery/draw', {
				method: 'POST',
				body: {
					poolId,
				},
			});
			if (res.success) {
				console.log('res.data...', res.data);
				const index = roulette.findIndex(item => item.id === res.data.id);
				luckyLottery.stop(index);
				setResult(res.data);
				await reloadUser();
				await fetchHistory();
			} else {
				showToast(res.msg, 'error');
				luckyLottery.stop(0);
				setResult(null);
				setIsLoading(false);
				console.log('spin error...', res);
			}
		} catch (error) {
			luckyLottery.stop(0);
			setResult(null);
			console.log('error...', error);
			showToast('Something went wrong, please try again later.', 'error');
			setIsLoading(false);
		}
	};

	useEffect(() => {
		if (result && isSpinEnd) {
			setIsOpenResult(true);
			reloadBalance();
		}
	}, [result, isSpinEnd]);

	useEffect(() => {
		if (poolId) {
			fetchHistory();
		}
	}, [poolId]);

	useEffect(() => {
		if (roulette.length > 0) {
			const lucky = new LuckyWheel(
				{
					el: '#lucky-lottery',
				},
				{
					width: 580,
					height: 580,
					blocks: [
						{ padding: '20px' },
						{
							padding: '40px',
						},
					],
					prizes: roulette.map((prize, index) => ({
						background: index % 2 === 0 ? '#FFE716' : '#C2BEFF',
						imgs: [
							{
								src: prize.image,
								width: '45%',
								top: '15%',
							},
						],
					})),
					buttons: [
						{
							radius: '20%',
							imgs: [
								{
									src: '/img/roulette/bg-center.png',
									width: '100%',
									top: '-130%',
								},
							],
						},
					],
					start: handleStartDraw,
					end: () => {
						setIsSpinEnd(true);
					},
				},
			);
			setLuckyLottery(lucky);
			setIsRendered(true);
		}
	}, [roulette]);

	const handleClick = (path: string) => {
		router.push(`/roulette/${path}`);
	};

	return (
		<div className="no-scrollbar flex h-screen w-full flex-col overflow-x-hidden overflow-y-scroll bg-bg-blue bg-cover">
			<div className="flex flex-grow flex-col items-center justify-start">
				<div
					className="fixed left-3 top-4 z-10 h-7 w-[85px] bg-bg-balance bg-[length:100%_100%] bg-no-repeat"
					onClick={() => setIsOpenHistory(true)}
				>
					<div className="flex h-7 w-full items-center justify-center gap-1">
						<img src="/img/icon/gift.svg" alt="gift" className="w-4" />
						<div className="font-jamjuree text-sm font-medium tracking-wide text-black">
							Record
						</div>
					</div>
				</div>
				{/* balance */}
				{/* <div
					className="fixed right-3 top-4 z-10 h-7 w-20 bg-bg-balance bg-[length:100%_100%] bg-no-repeat"
					onClick={() => router.push('/profile/v1')}
				>
					<div className="flex h-7 w-full items-center justify-center gap-1">
						<img src="/img/USDT.png" alt="usdt" className="w-4" />
						<div className="font-jamjuree text-sm font-medium uppercase tracking-wide text-black">
							${balance.usdt}
						</div>
					</div>
				</div> */}
				{/* roulette */}
				<div
					className={`relative -mt-[250px] h-[580px] w-[580px] rotate-180 bg-[length:100%_100%] bg-no-repeat ${isRendered ? 'bg-bg-roulette' : 'animate-pulse rounded-full bg-gray-300'}`}
				>
					<div id="lucky-lottery" className="mx-auto w-full"></div>
					{isRendered && (
						<div className="absolute -top-7 left-1/2 z-20 -translate-x-1/2">
							<img
								src="/img/roulette/point.png"
								alt="point"
								className="z-20 w-20 rotate-180"
							/>
						</div>
					)}
				</div>

				<RouletteTab />

				{/* roulette text */}
				<div className="mt-3 w-full text-center font-jamjuree text-[44px] font-bold italic leading-[48px] text-[#ffec47] text-shadow-yellow">
					Spin and win
				</div>
				<div className="mb-4 w-full text-center font-jamjuree text-[44px] font-bold italic leading-[48px] text-[#ffec47] text-shadow-yellow">
					great rewards!
				</div>

				{/* spin button */}
				<div className="mt-8 flex w-full justify-center">
					<button
						className={`relative h-16 w-80 ${isFree ? 'bg-bg-spin-btn-active' : isActive ? 'bg-bg-spin-btn-active' : 'bg-bg-spin-btn-inactive'} bg-[length:100%_100%] bg-no-repeat`}
						onClick={() => {
							handleStartDraw();
						}}
						disabled={isLoading}
					>
						<img
							src={
								isFree
									? '/img/bg-spin-btn-active.png'
									: isActive
										? '/img/bg-spin-btn-active.png'
										: '/img/bg-spin-btn-inactive.png'
							}
							alt="spin button"
							className="absolute inset-0 h-full w-full object-cover"
						/>
						<div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
							<div className="flex items-center justify-center">
								{isFree && (
									<div className="font-chakra text-base font-semibold tracking-wider text-white">
										FREE SPIN × {freeDrawCount}
									</div>
								)}
								{!isFree && (
									<>
										<img
											src="/img/icon/coin.svg"
											alt="coin"
											className="mr-1 w-4"
										/>
										<div className="mr-4 font-chakra text-base font-semibold uppercase tracking-wider text-white">
											500
										</div>
										<div className="text-center font-chakra text-base font-semibold uppercase tracking-wide text-white">
											Spin
										</div>
									</>
								)}
							</div>
						</div>
						{isLoading && (
							<LoaderCircle
								className="absolute right-[15%] top-[30%] animate-spin"
								color="white"
							/>
						)}
					</button>
				</div>
				{isFree && (
					<div
						className={`mx-auto mt-2 w-72 text-center font-jamjuree text-base font-medium leading-5 ${isFree ? 'text-white' : 'text-[#979797]'}`}
					>
						Every day, you get a free spin.
					</div>
				)}
				{!isFree && !isActive && (
					<div className="mx-auto mt-2 w-72 text-center font-jamjuree text-base font-medium leading-5 text-[#979797]">
						Not enough coins! Gain more coins by inviting friends or{' '}
						<Link
							href={'/profile/v1'}
							onClick={() => showRouterLoading('/profile/v1')}
						>
							<span className="cursor-pointer underline">Topping Up</span>
						</Link>
					</div>
				)}
			</div>
			<MainMenu />
			{/* 抽奖历史 */}
			<RouletteHistoryDrawer
				isOpen={isOpen}
				type="general"
				history={history}
				onClose={() => {
					setIsOpenHistory(false);
				}}
			/>
			{/* 中奖结果 */}
			<RouletteResultDrawer
				isOpen={isOpenResult}
				result={result}
				onClose={() => {
					setIsOpenResult(false);
					setIsLoading(false);
				}}
			/>
			{/* 提现 */}
			<WithdrawDrawer
				isOpen={isWithdrawOpen}
				onClose={() => {
					setIsWithdrawOpen(false);
				}}
			/>

			{/* 预加载 roles 的 character 图片 */}
			<PreloadImages loading={isLoadingImage} preloadImages={preloadImages} />
		</div>
	);
};

export default withAuth(RoulettePage);
